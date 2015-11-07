(function($, angular) {

    'use strict';

    /**
     * @see https://github.com/angular/angular.js/issues/1375
     */
    angular.module('cockpit.directives').directive('file', [function() {

        var mimetypeToExtension = {
            'text/csv'        : 'csv',
            'application/json': 'json'
        };

        return {

            restrict: 'E',

            scope   : {
                accept               : '@',
                placeholderTextInfo  : '@',
                placeholderTextSelect: '@',
                fileName             : '@'
            },

            //jshint multistr: true
            //jscs:disallowMultipleLineStrings false
            template: '\
                <button class="uk-placeholder uk-text-center uk-form-file  import-file">\
                    <i class="uk-icon-cloud-upload uk-icon-medium uk-text-muted uk-margin-small-right"></i>\
                    {{ placeholderTextInfo }}\
                    <a href="#">\
                        {{ placeholderTextSelect }}\
                        <input type="file" accept="{{ accept }}" />\
                    </a>\
                    <div class="uk-text-bold">{{ fileName }}</div>\
                </button>\
            ',
            //jshint multistr: false
            //jscs:disallowMultipleLineStrings false

            replace : true,

            require : 'ngModel',

            link    : function(scope, element, attr, ctrl) {

                var acceptedMimetypes = scope.accept.split(',');

                // Bind jQuery events
                element.bind('change', changeListener);
                element.bind('dragover', dragoverListener);
                element.bind('dragleave', dragleaveListener);
                element.bind('drop', dropListener);

                /**
                 * Change event
                 *
                 * @param {jQuery.Event} event
                 */
                function changeListener(event) {

                    // Cancel
                    if (!event.target.files.length) {
                        return;
                    }

                    var fileName = event.target.files[0].name;
                    var fileType;

                    acceptedMimetypes.forEach(function(accepted) {

                        var regExp = new RegExp('\.' + mimetypeToExtension[accepted] + '$', 'i');

                        if (fileName.match(regExp)) {
                            fileType = accepted;
                        }
                    });

                    // Check extension (text/csv mime type is not detected in browsers)
                    if (!fileType) {
                        element.addClass('import-file-error');

                        scope.$apply(function() {
                            scope.fileName = fileName;
                        });

                        return;
                    }

                    scope.filename = fileName;

                    element
                        .addClass('import-file-drop')
                        .removeClass('import-file-error');

                    scope.$apply(function() {

                        ctrl.$setViewValue((attr.multiple) ?
                            event.target.files :
                            event.target.files[0]
                        );
                    });
                }

                /**
                 * Drag over element
                 *
                 * @param {jQuery.Event} [event]
                 */
                function dragoverListener(event) {

                    element
                        .addClass('import-file-dragover')
                        .removeClass('import-file-error');
                }

                /**
                 * Drag leave
                 *
                 * @param {jQuery.Event} event
                 */
                function dragleaveListener(event) {

                    element
                        .removeClass('import-file-dragover')
                        .removeClass('import-file-error');
                }

                /**
                 * Drop file
                 *
                 * @param {jQuery.Event} event
                 */
                function dropListener(event) {
                }
            }
        };
    }]);

})(window.jQuery, window.angular);
