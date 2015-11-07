(function(App) {

    'use strict';

    App.module.factory('Processor', ['$http', function ProcessorFactory($http) {

        Processor.$http = $http;

        return Processor;

    }]);

    /**
     * Processor
     *
     * @class
     * @param {Array} tableData
     * @param {Array} dataMapper
     * @param {string} collectionId
     * @param {Object} [options]
     * @param {Object} [callbacks]
     */
    function Processor(tableData, dataMapper, collectionId, options, callbacks) {

        // Clone data, it
        this.dataMapper      = dataMapper;
        this.collectionId    = collectionId;
        this.options         = (options || {offset: 0, limit: undefined, bufferLength: 5});
        this.callbacks       = (callbacks || {});

        // Sanitize options here
        this.options.offset = Math.min(options.offset, tableData.length);

        this.options.limit = (typeof options.limit == 'number') ?
             Math.min(this.options.offset + options.limit, tableData.length) :
             undefined;

        // Create buffer
        this.remainingBuffer = tableData.slice(this.options.offset, this.options.limit);

        this.options.bufferLength = Math.min(options.bufferLength, this.remainingBuffer.length);

        // Stack for entries being processed
        this.currentBuffer   = [];
        this.dataLength      = this.remainingBuffer.length;
        this.lastEntries     = 0;
    }

    /**
     * Start processing
     *
     * @return {Processor}
     */
    Processor.prototype.start = function() {

        // Trigger onStart event
        if (typeof this.callbacks.onStart == 'function') {
            this.callbacks.onStart();
        }

        // Wipe
        if (this.options.wipeOut) {

            Processor.$http.post(
                App.route('/api/collections/emptytable'),
                {
                    collection: {
                        _id: this.collectionId
                    }
                },
                {
                    responseType: 'json'
                }
            )
                .success(function(data) {
                    start.call(this);
                }.bind(this))

                .error(App.module.callbacks.error.http)
            ;
        } else {
            start.call(this);
        }

        return this;

        /**
         * Start action
         */
        function start() {
            // jshint validthis: true
            for (var i = 0; i < this.options.bufferLength; i++) {
                this.processRow(this.remainingBuffer.shift());
            }
            // jshint validthis: false
        }
    };

    /**
     * Convert row data to entry
     *
     * @protected
     * @param {Object} dataRow
     * @param {Function} callback
     * @return {Object}
     */
    Processor.prototype.getEntryData = function(dataRow, callback) {

        // Static data
        var entry = {};

        var processedSlugs = 0;
        var totalSlugs     = this.dataMapper.filter(function(dataMapperRow) {
            return (dataMapperRow.field.slug && dataMapperRow.slugColumn !== undefined);
        }).length;

        // Fields
        this.dataMapper.forEach(function(dataMapperRow) {

            // Get data from row and add filter
            if (dataMapperRow.column !== undefined) {

                dataMapperRow.input = dataRow[dataMapperRow.column];

                if (dataMapperRow.filter) {
                    dataMapperRow.output = dataMapperRow.filter(dataMapperRow.input, dataMapperRow.field);
                } else {
                    dataMapperRow.output = dataMapperRow.input;
                }

                entry[dataMapperRow.field.name] = dataMapperRow.output;
            }

            // Add in locales
            if (dataMapperRow.field.localize && dataMapperRow.localizations.length) {

                dataMapperRow.localizations.forEach(function(localization) {

                    if (localization.column) {

                        // Copy over data into localization
                        localization.output = dataRow[localization.column];

                        // Store in entry
                        entry[dataMapperRow.field.name + '_' + localization.code] = localization.output;
                    }
                });
            }

            // Process slug
            if (dataMapperRow.field.slug && dataMapperRow.slugColumn !== undefined) {

                // Save in input
                dataMapperRow.slugInput = dataRow[dataMapperRow.slugColumn];

                // note: Using setTimeout because of instant DOM update-read is involved.
                // see: http://stackoverflow.com/questions/779379/why-is-settimeoutfn-0-sometimes-useful
                window.setTimeout(function() {
                    entry[dataMapperRow.field.name + '_slug'] = dataMapperRow.slugOutput;

                    // If this is last async function, invoke callback.
                    if (++processedSlugs >= totalSlugs) {
                        callback.call(this, entry);
                    }
                }.bind(this), 10);
            }

        }, this);

        // When there are no async functions, invoke callback.
        if (!totalSlugs) {
            callback.call(this, entry);
        }

        return entry;
    };

    /**
     * Proccess given row
     * [async]
     *
     * @protected
     * @param {Object} dataRow
     * @return {Processor}
     */
    Processor.prototype.processRow = function(dataRow) {

        // V1 (using async data)
        this.getEntryData(dataRow, function(entryData) {

            Processor.$http.post(
                App.route('/api/collections/saveentry'),
                {
                    collection: {
                        _id: this.collectionId
                    },
                    entry     : entryData
                }
            /**
                // Test
                App.route('/api/collections/findOne'),
                {
                    filter: {
                        _id: this.collectionId
                    }
                },
                {
                    responseType: 'json'
                }
            */
            )
                .success(function(data, status, headers, config) {
                    this.finishedProcessingEntry(dataRow);
                }.bind(this))

                .error(function(data, status, headers, config) {
                    this.finishedProcessingEntry(dataRow, data);
                }.bind(this))
            ;
        });

        return this;
    };

    /**
     * Finalize tasks after entry has (not) been cerated.
     *
     * @protected
     * @param {Object} dataRow
     * @param {boolean} [errorDetails] - None when no errors
     * @return {Processor}
     */
    Processor.prototype.finishedProcessingEntry = function(dataRow, errorDetails) {

        var rowIndex = this.currentBuffer.indexOf(dataRow);

        // Remove row from buffer.
        // Hopefully there won't be two similar rows in buffer at one time.
        if (rowIndex > -1) {
            this.currentBuffer.splice(rowIndex, 1);
        }

        // Mark failure
        if (errorDetails && typeof this.callbacks.onError == 'function') {
            this.callbacks.onError(dataRow, erorDetails);
        }

        if (typeof this.callbacks.onProgress == 'function') {
            this.callbacks.onProgress((this.dataLength - this.remainingBuffer.length) / this.dataLength * 100);
        }

        // There are still rows to proces
        if (this.remainingBuffer.length) {
            this.processRow(this.remainingBuffer.shift());
            return this;
        }

        this.lastEntries++;

        if (this.lastEntries == this.options.bufferLength) {

            if (typeof this.callbacks.onComplete == 'function') {
                this.callbacks.onComplete();
            }
        }

        return this;
    };

})(window.App);
