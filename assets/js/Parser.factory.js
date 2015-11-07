(function(App) {

    'use strict';

    /**
     * Parsers
     *
     * @class
     */
    App.module.factory('parser', [function parserFactory() {

        return {
            /**
             * Parse CSV file
             * [async]
             *
             * @static
             * @param {File} file
             * @param {Object} options
             * @param {Function} options.onError
             * @param {Function} options.onComplete
             */
            csv : function(file, options) {

                Papa.parse(file, {
                    header        : false,
                    skipEmptyLines: true,
                    delimiter     : (options.delimiter || ''),
                    newline       : (options.newline || ''),
                    encoding      : (options.encoding || ''),
                    complete      : (options.onComplete || angular.noop),
                    error         : (options.onError || angular.noop)
                });

                return;
            },

            /**
             * Parse JSON file
             * [async]
             *
             * @static
             * @param {File} file
             * @param {Object} options
             * @param {Function} options.onError
             * @param {Function} options.onComplete
             */
            json: function(file, options) {

                options.onComplete = (options.onComplete || angular.noop);
                options.onError = (options.onError || angular.noop);

                var reader = new FileReader();

                reader.onload = onloadListener;

                reader.readAsText(file, options.encoding);

                return;

                /**
                 * Process file after it has been loaded
                 *
                 * @param {Event} loadEvent
                 */
                function onloadListener(loadEvent) {
                    var data;
                    var response = {
                        data  : [],
                        errors: [],
                        meta  : {}
                    };

                    try {
                        data = angular.fromJson(loadEvent.target.result);
                    } catch (e) {
                        ressponse.errors.push(e);

                        options.onError(e, file);
                        options.onComplete(response);

                        return;
                    }

                    var header = [];
                    var row;
                    var rowNo;
                    var colName;
                    var colInHeaderindex;

                    for (rowNo in data) {

                        row = [];

                        for (colName in data[rowNo]) {

                            colInHeaderindex = header.indexOf(colName);

                            // New column
                            if (colInHeaderindex == -1) {
                                colInHeaderindex = header.push(colName) - 1;
                            }

                            row[colInHeaderindex] = data[rowNo][colName];
                        }

                        response.data.push(row);
                    }

                    response.data.forEach(function(row) {
                        // Standardize lengths
                        row.length = header.length;
                        // Fill up with nulls instead of undefined
                        row.forEach(function(cell) {
                            if (cell === undefined) {
                                cell = null;
                            }
                        });
                    });

                    response.data.unshift(header);

                    options.onComplete(response);
                }
            }
        };

    }]);

})(window.App);
