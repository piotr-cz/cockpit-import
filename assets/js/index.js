/**
 * ImportController
 *
 * @todo Translated fields don't Update
 * @todo Slugs are mixed up (probably due to async) (workaround: buffer: 1)
 */
(function($, angular, App) {

    /**
     * ImportController
     * @class
     */
    App.module.controller('importController', [
        '$scope', '$http', '$filter', '$q', '$timeout', 'parser', 'Processor',
        function($scope, $http, $filter, $q, $timeout, parser, Processor) {

            // DEBUG
            window._CTR = $scope;

            /**
             * Selected collection id
             * @type {float}
             */
            $scope.collectionId = undefined;

            // Auto-select
            if (COLLECTION_ID) {
                $timeout(function() {
                    $scope.collectionId = COLLECTION_ID;
                }, 0);
            }

            /**
             * Currently selected collection
             * @type {Object}
             */
            $scope.collection = undefined;

            /**
             * Collections cache for fast switching
             * @type {Object}
             * @private
             */
            var collectionsCache = {};

            /**
             * List of available additional locales
             * @type {Array}
             * @private
             */
            var additionalLocales = (LOCALES || []);

            /**
             * Processing state
             * @type {Object}
             */
            $scope.process = {
                started : false,
                progress: 0
            };

            /**
             * Uploaded file object
             * @type {File}
             */
            $scope.spreadsheetFile = null;

            /**
             * CSV import options
             * @type {Object}
             */
            $scope.importOptions = {
                encoding : '', // 'UTF-8' // Available in Papa Parse

                shown    : false,
                hasHeader: true,

                delimiter: '', // , | ; | : \t \s // Available in Papa Parse
                enclosure: '"', // " | '
                escape   : '\\',
                newline  : '', // '\n' // Available in Papa Parse
            };

            /**
             * Processing options
             * Buffer higher than 1 creates duplicated items, option is disabled in view.
             * @type {Object}
             */
            $scope.processOptions = {
                wipeOut     : false,
                offset      : 0,
                limit       : undefined,
                bufferLength: 1,
            };

            /**
             * Data mapping Matrix
             * @type {Array}
             * @see http://stackoverflow.com/questions/15973985/using-ng-model-within-nested-ng-repeat-directives
             */
            $scope.dataMapper = window._DATAMAPPER = [];

            /**
             * Available import file columns
             * @type {Array}
             * @private
             */
            var availableColumns = window._COLUMNS = [{
                label: App.i18n.get('import.label.Please select'),
                value: undefined
            }];

            /**
             * Available filters
             * Each filer is a function with properties:
             * - label - Translated label to show in options
             * - name - not used
             *
             * @type {Array}
             * @private
             */
            var availableFilters = [
                // Location, Date, Time, Gallery, Tags, Multi-field, Media, Region
                $filter('noopCockpitFilter'),
                // Text, HTML, markdown, HTML (WYSIWYG), code
                $filter('textCockpitFilter'),
                // Select
                $filter('selectCockpitFilter'),
                // Boolean
                $filter('booleanCockpitFilter'),
                // Location
                $filter('locationCockpitFilter'),
                // Collection link
                $filter('linkCollectionBynameCockpitFilter')
            ];

            var tableData = window._TABLE = [];

            //// Event listeners

            /**
             * Observe change
             *
             * @param {string|undefined} id - Collection id
             * @param {string|undefined} prevId - Previous
             */
            $scope.$watch('collectionId', function(id, prevId, $scope) {

                // Ignore initial state
                if (angular.equals(id, prevId)) {
                    return;
                }

                if (collectionsCache[id]) {
                    $scope.collection = collectionsCache[id];

                    afterCollectionChange();
                    return;
                }

                $http.post(
                    App.route('/api/collections/findOne'),
                    {
                        filter: {
                            _id: id
                        }
                    },
                    {
                        responseType: 'json'
                    }
                )
                    .success(function(data) {
                        $scope.collection =
                            collectionsCache[id] =
                            data
                        ;

                        afterCollectionChange();
                    })
                    .error(App.module.callbacks.error.http)
                ;

                /**
                 * Change selected collection
                 */
                function afterCollectionChange() {

                    $scope.dataMapper.length = 0;

                    // Build data mapper matrix
                    $scope.collection.fields.forEach(function(field, i) {

                        // Try to pick filter by field type
                        var filter = $filter('noopCockpitFilter');

                        switch (field.type) {
                            case 'select':
                                filter = $filter('selectCockpitFilter');
                                break;

                            case 'boolean':
                                filter = $filter('booleanCockpitFilter');
                                break;

                            case 'location':
                                filter = $filter('locationCockpitFilter');
                                break;

                            case 'link-collection':
                                filter = $filter('linkCollectionBynameCockpitFilter');
                                break;

                            default:
                                break;
                        }

                        var localizations = [];

                        // Push for every locale (See entry.js: LOCALES)
                        if (field.localize) {
                            additionalLocales.forEach(function(locale) {

                                localizations.push({
                                    code: locale,
                                    output: '',
                                    filter: filter,
                                    column: undefined
                                });
                            });
                        }

                        $scope.dataMapper.push({
                            i               : i,
                            field           : field,
                            column          : undefined,
                            slugColumn      : undefined,
                            availableColumns: availableColumns,
                            filter          : filter,
                            availableFilters: availableFilters,
                            input           : '',
                            output          : '',
                            slugInput       : '',
                            slugOutput      : '',
                            localizations   : localizations
                        });

                    }, this);
                }
            });

            /**
             * Added new spreeadsheet file
             *
             * @param {File|undefined} file
             * @param {File|undefined} prevFile
             */
            $scope.$watch('spreadsheetFile', function(file, prevFile, $scope) {

                // Ignore initial state
                if (angular.equals(file, prevFile)) {
                    return;
                }

                var extension = file.name.match(/\.([^\.]+)$/)[1];
                var parseFn;
                var options;

                switch (extension.toLowerCase()) {

                    // PapaParse
                    case 'csv':
                        parseFn = parser.csv;

                        options = {
                            delimiter: $scope.importOptions.delimiter,
                            newline  : $scope.importOptions.newline,
                            encoding : $scope.importOptions.encoding
                        };

                        break;

                    // JSON.parse
                    case 'json':
                        parseFn = parser.json;

                        options = {
                            encoding: $scope.importOptions.encoding
                        };

                        // Overwrite all datamapper filters by noop
                        $scope.dataMapper.forEach(function(field, i) {
                            field.filter = $filter('noopCockpitFilter');
                        }, this);

                        break;
                }

                // Invoke parsing function
                parseFn(file, angular.extend(options, {
                    onComplete: processResponse,
                    onError   : function(errorDetails, file, element, reason) {
                        App.notify(App.i18n.get('import.notify.Error loading file'), 'warning');
                    }
                }));

                /**
                 * Process read file data
                 *
                 *  Variables from Controller scope:
                 * - tableData
                 * - availableColumns
                 * - $scope.dataMapper
                 *
                 * Function from Controller scope:
                 * - $scope.changeSlugColumn
                 * - applyFilter
                 *
                 * @param {Object} response
                 * @param {Array} response.data
                 * @param {Array} response.errors
                 * @param {Object} response.meta
                 */
                function processResponse(response) {

                    var headersData;

                    if (response.errors.length) {
                        App.notify(response.errors[0].message, 'danger');
                        return;
                    }

                    headersData = response.data.shift();

                    tableData.length = 0;

                    response.data.forEach(function(row, i) {
                        tableData[i] = row;
                    }, this);

                    availableColumns.length = 1;

                    headersData.forEach(function(header, i) {

                        availableColumns.push({
                            label: ($scope.importOptions.hasHeader) ?
                                header :
                                App.i18n.get('import.header.ColumnNo', i),
                            value: i
                        });
                    }, this);

                    $scope.$apply(function() {

                        $scope.dataMapper.forEach(function(dataMapperRow) {

                            // Auto-set mapper
                            if ($scope.dataMapper.length) {

                                var headersIndex = headersData.indexOf(dataMapperRow.field.name);
                                var headersSlugIndex;

                                if (headersIndex != -1) {
                                    dataMapperRow.column = headersIndex;
                                    $scope.changeColumn(dataMapperRow, headersIndex);
                                }

                                // It has slug
                                if (dataMapperRow.field.slug) {
                                    headersSlugIndex = headersData.indexOf(dataMapperRow.field.name + '_slug');

                                    // There is no slug, but we may use found column anyway.
                                    if (headersSlugIndex == -1 && headersIndex != -1) {
                                        headersSlugIndex = headersIndex;
                                    }

                                    if (headersSlugIndex != -1) {
                                        dataMapperRow.slugColumn = headersSlugIndex;
                                        $scope.changeSlugColumn(dataMapperRow, headersSlugIndex);
                                    }
                                }

                                // It may be localized in spreadsheet by adding suffix
                                if (dataMapperRow.field.localize) {

                                    dataMapperRow.localizations.forEach(function(localization) {
                                        var headersLocalizationIndex = headersData.indexOf(
                                            dataMapperRow.field.name + '_' + localization.code
                                        );

                                        if (headersLocalizationIndex != -1) {
                                            localization.column = headersLocalizationIndex;
                                            $scope.changeLocalizationColumn(
                                                dataMapperRow,
                                                localization,
                                                headersLocalizationIndex
                                            );
                                        }

                                    }, this);
                                }
                            }

                            applyFilter(dataMapperRow);
                        });
                    });
                }
            });

            // Use backend to parse file
            if (false) {
                $scope.$watch('file', function(fileData, oldFileData) {

                    // Ignore initial state
                    if (angular.equals(fileData, oldFileData)) {
                        return;
                    }

                    // or https://github.com/mholt/PapaParse
                    $http.post(App.route('/api/import/parseString'), {
                        importOptions: $scope.importOptions,
                        fileString   : fileData
                    }, {
                        responseType: 'json'
                    })
                        .success(function(response) {

                            if (!response.success) {
                                App.notify(App.i18n.get('Uuups, something went wrong...'), 'danger');
                                return;
                            }

                            var headersData = response.data.header;

                            tableData.length = 0;

                            response.data.table.forEach(function(row, i) {
                                tableData[i] = row;
                            }, this);

                            availableColumns.length = 1;

                            headersData.forEach(function(header, i) {

                                availableColumns.push({
                                    label: ($scope.importOptions.hasHeader) ?
                                        header :
                                        App.i18n.get('import.header.ColumnNo', i),
                                    value: i
                                });
                            }, this);
                        })
                        .error(App.module.callbacks.error.http)
                    ;
                });
            }

            //// Methods

            /**
             * Changed column
             *
             * @param {Object} dataMapperRow
             * @param {integer} columnIndex
             */
            $scope.changeColumn = function(dataMapperRow, columnIndex) {

                if (columnIndex === undefined) {
                    dataMapperRow.input = dataMapperRow.output =  '';
                    return;
                }

                dataMapperRow.input = tableData[$scope.processOptions.offset][columnIndex];

                applyFilter(dataMapperRow);
            };

            /**
             * Changed column for slug
             *
             * @param {Object} dataMapperRow
             * @param {integer} slugColumnIndex
             */
            $scope.changeSlugColumn = function(dataMapperRow, slugColumnIndex) {

                if (slugColumnIndex === undefined) {
                    dataMapperRow.slugInput = '';
                    return;
                }

                dataMapperRow.slugInput = tableData[$scope.processOptions.offset][slugColumnIndex];
            };

            /**
             * Chaned filter
             *
             * @param {Object} dataMapperRow
             * @param {string} filter
             */
            $scope.changeFilter = function(dataMapperRow, filter) {

                applyFilter(dataMapperRow);
            };

            /**
             * Switched localization column
             *
             * @param {Object} dataMapperRow
             */
            $scope.changeLocalizationColumn = function(dataMapperRow, localization, localizationColumnIndex) {

                if (localizationColumnIndex === undefined) {
                    localization.output = '';
                    return;
                }

                localization.output = tableData[$scope.processOptions.offset][localizationColumnIndex];
            };

            /**
             * Changed offset
             *
             * @param {string} offset
             */
            $scope.changeOffset = function(offset) {

                if (!tableData.length) {
                    return;
                }

                // Sanitize
                $scope.processOptions.offset = (offset === null || offset === undefined) ?
                    0 :
                    Math.min(tableData.length - 1 - ($scope.processOptions.limit || 0), parseInt(offset))
                ;

                // Update table
                $scope.dataMapper.forEach(function(row, i) {
                    $scope.changeColumn(row, row.column);
                    $scope.changeSlugColumn(row, row.slugColumn);
                    row.localizations.forEach(function(localization, j) {
                        $scope.changeLocalizationColumn(row, localization, localization.column);
                    });
                });
            };

            /**
             * Changed limit
             *
             * @param {string} limit
             */
            $scope.changeLimit = function(limit) {

                if (!tableData.length) {
                    return;
                }

                // Samitize
                $scope.processOptions.limit = (!limit) ?
                    undefined :
                    Math.min(tableData.length - $scope.processOptions.offset, parseInt(limit))
                ;
            };

            /**
             * Execute procesing
             */
            $scope.go = function() {

                var start = new Date();
                var processor;
                var doesNotValidate = false;

                // Validate data before passing further
                $scope.dataMapper.forEach(function(dataMapperRow) {
                    if (dataMapperRow.field.required && dataMapperRow.column === undefined) {
                        doesNotValidate = true;
                        App.notify(
                            App.i18n.get(
                                'Please select column for required field %s',
                                dataMapperRow.field.label || dataMapperRow.field.name
                            ),
                            'danger'
                        );

                        return;
                    }
                });

                if (doesNotValidate) {
                    return;
                }

                processor = new Processor(
                    tableData,
                    $scope.dataMapper,
                    $scope.collectionId,
                    $scope.processOptions,
                    {
                        onStart   : function() {
                            $scope.process.started  = true;
                            $scope.process.progress = 0;
                        }.bind(this),

                        onProgress: function(percentage) {
                            $scope.process.progress = percentage.toFixed(2);
                        }.bind(this),

                        onError   : function(dataRow, message, index) {
                            App.notify(message, 'warning');

                            if (window.console) {
                                window.console.warn(message, dataRow);
                            }
                        },

                        onComplete: function() {
                            $scope.process.started = false;

                            App.notify(App.i18n.get('import.notify.Import complete'), 'success');

                            if (window.console) {
                                window.console.log('done in ' + (new Date() - start));
                            }
                        }.bind(this)
                    }
                );

                processor.start();
            };

            return;

            //// Helpers

            /**
             * Input -> filter -> output
             *
             * Similar process must happen in Processor.getEntryData
             *
             * @param {Object} dataMapperRow
             * @param {Function} dataMapperRow.filter
             * @param {*} dataMapperRow.input
             * @param {*} dataMapperRow.output
             */
            function applyFilter(dataMapperRow) {

                var deferred;
                var promise;

                // No filter
                if (!dataMapperRow.filter) {
                    dataMapperRow.output = dataMapperRow.input;
                // Stateless filter
                } else if (!dataMapperRow.filter.$stateful) {
                    dataMapperRow.output = dataMapperRow.filter(dataMapperRow.input, dataMapperRow.field);
                // Stateful filter
                } else {
                    deferred = $q.defer();

                    dataMapperRow.output = dataMapperRow.filter(dataMapperRow.input, dataMapperRow.field, {
                        deferred: deferred
                    });

                    // This itself triggers $scope.digest(), as long as filters' output is updated.
                    // Otherwise use dataMapperRow.output = output.
                    deferred.promise
                        .then(function(output) {})
                        .catch(function(error) {
                            error = (error || 'Unknown error');

                            App.notify(
                                App.i18n.get('import.notify.Import field error', error),
                                'warning'
                            );
                        });
                }

                return;
            }
        }
    ]);

})(window.jQuery, window.angular, window.App);
