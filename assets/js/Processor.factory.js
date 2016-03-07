(function(App) {

    'use strict';

    App.module.factory('Processor', ['$q', '$http', '$timeout', function ProcessorFactory($q, $http, $timeout) {

        Processor.$q = $q;
        Processor.$http = $http;
        Processor.$timeout = $timeout;

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
     * Proccess given row
     * [async]
     *
     * @protected
     * @param {Object} dataRow
     * @return {Processor}
     */
    Processor.prototype.processRow = function(dataRow) {

        /** @type {Object} Entry data */
        var entry = {};
        /** @type {Array} promises stack */
        var promises = [];

        // Loop trough mapper fields
        this.dataMapper.forEach(function(mapperRow, i) {

            // Merge in data collected synchronously
            this.decorateEntry(entry, promises, dataRow, mapperRow);
        }, this);

        // Save
        Processor.$q.all(promises)

            .then(angular.bind(this, function(entryDataRows) {

                // Prepend data collected synchronously
                entryDataRows.unshift({});
                entryDataRows.unshift(entry);

                // Append data collected asynchronously
                var entryData = angular.extend.apply(undefined, entryDataRows);

                Processor.$http.post(
                    App.route('/api/collections/saveentry'),
                    {
                        collection: {
                            _id: this.collectionId
                        },
                        entry     : entryData
                    }
                /*
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
                /**/
                )
                    .success(angular.bind(this, function(data, status, headers, config) {
                        this.finishedProcessingEntry(dataRow);
                    }))

                    .error(angular.bind(function(data, status, headers, config) {
                        this.finishedProcessingEntry(dataRow, data);
                    }))
                ;

                return entryData;
            }))
            // Promise should not have any catches
            .catch(angular.bind(this, function(error) {

                error = (error || 'Unknown error');

                this.finishedProcessingEntry(
                    dataRow,
                    App.i18n.get('import.notify.Import field error', error)
                );
            }));

        return this;
    };

    /**
     * Process entry cell
     * [async]
     *
     * @param {Object} entry
     * @param {Array} promises - Promises stack for async results
     * @param {Array} dataRow
     * @param {Object} mapperRow
     *
     * @return {Object} entry
     */
    Processor.prototype.decorateEntry = function(entryData, promises, dataRow, mapperRow) {

        var deferred;

        // Filter
        if (mapperRow.column !== undefined) {

            mapperRow.input = dataRow[mapperRow.column];

            // Filter
            if (!mapperRow.filter) {
                mapperRow.output = mapperRow.input;
            // Stateless filter
            } else if (!mapperRow.filter.$stateful) {
                mapperRow.output = mapperRow.filter(mapperRow.input, mapperRow.field);
            // Stateful filter
            } else {
                deferred = Processor.$q.defer();

                mapperRow.output = mapperRow.filter(mapperRow.input, mapperRow.field, {deferred: deferred});

                // Add async output from filter
                promises.push(
                    deferred.promise.then(function(filterOutput) {

                        entryData[mapperRow.field.name] = filterOutput;

                        return entryData;
                    })
                );

                // Add delay
                if (mapperRow.filter.delay) {
                    promises.push(Processor.$timeout(function() {}, mapperRow.filter.delay));
                }
            }

            // Set data so it's svailable for following processing
            entryData[mapperRow.field.name] = mapperRow.output;
        }

        // Add in locales
        if (mapperRow.field.localize && mapperRow.localizations.length) {

            mapperRow.localizations.forEach(function(localization) {

                if (localization.column) {

                    // Copy over data into localization
                    localization.output = dataRow[localization.column];

                    // Store in entry
                    entryData[mapperRow.field.name + '_' + localization.code] = localization.output;
                }
            });
        }

        // Process slug
        if (mapperRow.field.slug && mapperRow.slugColumn !== undefined) {

            // Save in input
            mapperRow.slugInput = dataRow[mapperRow.slugColumn];

            promises.push(
                Processor.$timeout(function() {

                    entryData[mapperRow.field.name + '_slug'] = mapperRow.slugOutput;

                    return entryData;
                }, 10)
            );
        }

        return entryData;
    };

    /**
     * Finalize tasks after entry has (not) been cerated.
     * When one task is finished, another is started
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
            this.callbacks.onError(dataRow, errorDetails, rowIndex);
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
