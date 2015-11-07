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
                    App.i18n.get('import.notify.Canont use this filter')
                        .replace('%s', field.label || field.name),
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
     * Make sure it's YYYY-MM-DD
     *
     * @see http://getuikit.com/docs/datepicker.html
     */
    angular.module('cockpit.filters').filter('dateCockpitFilter', function() {

        dateCockpitFilter.label = App.i18n.get('import.filter.date');
        dateCockpitFilter.supports = ['date'];

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

            options = (options || {lookupKey: 'name'});

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
