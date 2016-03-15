/**
 * Filters convert text strings into Cockpit field values.
 *
 * For native angular filters, see https://docs.angularjs.org/api/ng/filter
 * For guide how to write own filter, see https://docs.angularjs.org/guide/filter
 *
 * For list of cockpit content fields, see assets/js/angular/contentfields.js
 */
(function(angular, App) {

    /*
    text,
    select
    boolean
    html
    markdown
    location
    wysiwyg
    code
    date
    time
    gallery
    tags

    linkCollection
    mediaPathPicker
    regionPicker
    */

    /**
     * Noop filter
     *
     * @function
     */
    angular.module('cockpit.filters').filter('noopCockpitFilter', function() {

        noopCockpitFilter.label = App.i18n.get('import.filter.noop');
        noopCockpitFilter.supports = ['', 'gallery', 'tags', 'link-collection'];

        return noopCockpitFilter;

        function noopCockpitFilter(input) {
            return input;
        }

    });

    /**
     * Text filter
     *
     * @function
     */
    angular.module('cockpit.filters').filter('textCockpitFilter', function() {

        textCockpitFilter.label = App.i18n.get('import.filter.text');
        textCockpitFilter.supports = ['text', 'html', 'markdown', 'wysiwyg', 'code'];

        return textCockpitFilter;

        function textCockpitFilter(input) {
            return input.toString();
        }
    });

    /**
     * Select filter
     *
     * @function
     */
    angular.module('cockpit.filters').filter('selectCockpitFilter', [function() {

        selectCockpitFilter.label = App.i18n.get('import.filter.select');
        selectCockpitFilter.supports = ['select'];

        return selectCockpitFilter;

        function selectCockpitFilter(input, field) {

            var output = '';

            if (field.options === undefined) {
                App.notify(
                    App.i18n.get('import.notify.Canont use this filter', field.label || field.name),
                    'warning'
                );
            } else if (field.options.indexOf(input) >= 0) {
                output = input;
            }

            return output;
        }
    }]);

    /**
     * Boolean filter
     *
     * @function
     */
    angular.module('cockpit.filters').filter('booleanCockpitFilter', [function() {

        booleanCockpitFilter.label = App.i18n.get('import.filter.boolean');
        booleanCockpitFilter.supports = ['boolean'];

        return booleanCockpitFilter;

        function booleanCockpitFilter(input) {

            return Number(input == '1' || !!input);
        }
    }]);

    /**
     * Location filter
     * Delay should be at lest 10 queries per second
     *
     * @function
     *
     * @see https://developers.google.com/maps/documentation/geocoding/usage-limits
     */
    angular.module('cockpit.filters').filter('locationCockpitFilter',
    ['$q', '$document', '$timeout', function($q, $document, $timeout) {

        locationCockpitFilter.label = App.i18n.get('import.filter.location');
        locationCockpitFilter.supports = ['location'];
        locationCockpitFilter.$stateful = true;
        locationCockpitFilter.delay = 250;

        /** @type {google.maps.Geocoder} Cached geocoder */
        var geocoder;
        var cache = {};

        loadApi()
            .then(function() {
                geocoder = new google.maps.Geocoder();
            });

        return locationCockpitFilter;

        /**
         * @param {string} input - Data input
         * @param {Object} field
         * @param {string} field.label
         * @param {boolean} field.lst
         * @param {string} field.name
         * @param {boolean} field.required
         * @param {string} field.type
         * @param {Object} field.options - Field specific options
         * @param {Object} field.options.deferred
         */
        function locationCockpitFilter(input, field, options) {

            options = (options || {});

            var output = {lat: undefined, lng: undefined, address: undefined};

            // Check in cache
            if (cache.hasOwnProperty[input]) {

                options.deferred.resolve(cache[input]);

                return cache[input];
            }

            geocoder.geocode({address: input}, function(results, status) {

                var foundLocation;

                if (status === google.maps.GeocoderStatus.OK && results.length > 0) {

                    var result = results.shift();
                    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
                    var data = {
                        lat    : result.geometry.location.lat().toFixed(10) / 1,
                        lng    : result.geometry.location.lng().toFixed(10) / 1,
                        address: result.formatted_address
                    };
                    // jscs:enable

                    angular.extend(output, data);

                    cache[input] = data;

                    if (options.deferred) {
                        options.deferred.resolve(data);
                    }

                // Probably status is google.maps.GeocoderStatus.OVER_QUERY_LIMIT
                } else if (options.deferred) {

                    options.deferred.reject(status);
                }

                return;
            });

            return output;
        }

        /**
         * Load Google JS API and Google Maps API
         *
         * @return {Object} Promise
         */
        function loadApi() {

            var deferred = $q.defer();
            var locale   = $document.prop('documentElement').lang;
            var script;

            // Maps have alreadby been loaded
            if (window.google && window.google.maps) {

                deferred.resolve();

            // JS API is available
            } else if (window.google) {

                loadMapsApi();

            // Need to load both
            } else {

                script = window.document.createElement('script');

                script.async = true;

                script.onload = loadMapsApi;

                script.onerror = function() {

                    App.notify(App.i18n.get('Failed loading google maps api.'), 'warning');

                    deferred.reject();
                };

                script.src = 'https://www.google.com/jsapi';

                document.body.appendChild(script);
            }

            return deferred.promise;

            function loadMapsApi() {
                // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
                google.load('maps', '3', {other_params: 'libraries=places&language=' + locale, callback: function() {
                    // jscs:enable
                    if (google.maps.places) {
                        deferred.resolve();
                    }
                }});
            }
        }
    }]);

    /**
     * Make sure it's YYYY-MM-DD
     *
     * @see http://getuikit.com/docs/datepicker.html
     */
    angular.module('cockpit.filters').filter('dateCockpitFilter', function() {

        dateCockpitFilter.label = App.i18n.get('import.filter.date');
        dateCockpitFilter.supports = ['date'];

        // Load Maps API

        return dateCockpitFilter;

        function dateCockpitFilter(input) {

            // Validate date
            var date = new Date(input);
            var formatted;

            // Check that it's not Invalid Date
            if (isNaN(date.getTime())) {
                return '';
            }

            formatted = date.toISOString();

            return formatted.match(/(.+)\T/)[1];
        }
    });

    /**
     * Time picker
     *
     * @function
     *
     * @see http://getuikit.com/docs/timepicker.html
     */
    angular.module('cockpit.filters').filter('timeCockpitFilter', function() {

        timeCockpitFilter.label = App.i18n.get('import.filter.time');
        timeCockpitFilter.supports = ['time'];

        return timeCockpitFilter;

        function timeCockpitFilter(input) {

            // Validate time
            var date = '2000-01-01\\T' + input;
            var formatted;

            // Check that it's not Invalid Date
            if (isNaN(date.getTime())) {
                return '';
            }

            formatted = date.toISOString();

            return formatted.match(/\T(\d{2}:\d{2})/)[1];
        }
    });

    /**
     * Link collection by name
     *
     * @function
     */
    angular.module('cockpit.filters').filter('linkCollectionBynameCockpitFilter', ['$http', function($http) {

        // Load up all collections
        var collections       = [];
        var collectionEntries = {};

        $http.post(
            App.route('/api/collections/find'),
            {
            },
            {
                responseType: 'json'
            }
        )
            .success(function(data) {

                collections = data;

                // Get entries of all collections
                collections.forEach(function(collection) {

                    // TODO: something with collection.fields
                    $http.post(
                        App.route('/api/collections/entries'),
                        {
                            collection: {
                                _id      : collection._id,
                                sortfield: null
                            }
                        },
                        {
                            responseType: 'json'
                        }
                    )
                        .success(function(data) {
                            collectionEntries[collection._id] = data;
                        })
                        .error(App.module.callbacks.error)
                    ;

                });

            })
            .error(App.module.callbacks.error.http)
        ;

        linkCollectionBynameCockpitFilter.label = App.i18n.get('import.filter.linkCollectionByname');
        linkCollectionBynameCockpitFilter.supports = ['link-collection'];

        return linkCollectionBynameCockpitFilter;

        function linkCollectionBynameCockpitFilter(input, field, options) {

            options = (options || {lookupKey: 'Name'});

            var foundEntryId;

            // Find collection
            if (!field.hasOwnProperty('collection') || !collectionEntries.hasOwnProperty(field.collection)) {
                return foundEntryId;
            }

            collectionEntries[field.collection].forEach(function(collectionEntry) {

                if (collectionEntry[options.lookupKey] == input) {
                    foundEntryId = collectionEntry._id;
                }
            });

            return foundEntryId;
        }
    }]);

})(window.angular, window.App);
