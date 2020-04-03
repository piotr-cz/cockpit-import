<?php
/**
 * Main view
 */
?>
@start('header')

    {{ $app->assets(['import:assets/import.css'], $moduleMetadata->version) }}

    {{ $app->assets(['import:assets/3p/papaparse.js'], $moduleMetadata->version) }}

    {{ $app->assets(['import:assets/import.js', 'import:assets/js/filters.js', 'import:assets/js/file.directive.js', 'import:assets/js/Processor.factory.js', 'import:assets/js/Parser.factory.js', 'import:assets/js/index.js'], $moduleMetadata->version)}}

    <script>
        // jshint ignore:start
        var LOCALES             = {{ json_encode($locales) }};
        var COLLECTION_ID       = {{ json_encode($collectionId) }};
        var GOOGLE_MAPS_API_KEY = '{{ $gmapskey }}';
        // jshint ignore:end
    </script>

@end('header')
<div data-ng-controller="importController">
    <nav class="uk-navbar">
        <span class="uk-hidden-small uk-navbar-brand">@lang('import.title.Import')</span>
    </nav>

    @if(count($collections))
    <form class="uk-form">

        <div class="uk-grid">
            <div class="uk-width-medium-1-2">
                <div class="app-panel">
                    <fieldset data-ng-disabled="process.started">
                        <legend>
                            <span class="uk-badge uk-badge-notification">1</span>
                            @lang('import.label.Parsing')
                        </legend>

                        <div class="uk-form-row">
                            <label class="uk-text-small">@lang('import.label.Pick collection')</label>
                            <div class="uk-form-controls">
                                <select data-ng-model="collectionId" required="required">
                                @foreach($collections as $collection)
                                    <option value="{{ $collection['_id'] }}"
                                        @if ($collectionId == $collection['_id'])
                                            selected="selected"
                                        @endif
                                        >
                                        {{ $collection['name'] }}
                                    </option>
                                @endforeach
                                </select>
                            </div>
                        </div>

                        <div class="uk-form-row">
                            <label class="uk-text-small">@lang('import.label.Upload file')</label>
                            <div class="uk-form-controls">
                                <file
                                    data-ng-model="spreadsheetFile"
                                    data-ng-disabled="!collection"
                                    data-accept="text/csv,application/json"
                                    data-placeholder-text-info="@lang('import.label.Add file Info')"
                                    data-placeholder-text-select="@lang('import.label.Add file Select')"
                                />
                            </div>
                        </div>

                        <div class="uk-form-row">
                            <button
                                class="uk-button uk-button-small"
                                data-ng-class="{'uk-active': importOptions.shown}"
                                data-ng-model="importOptions.shown"
                                data-ng-click="importOptions.shown = !importOptions.shown"
                            >
                                @lang('import.btn.Advanced parsing options')
                            </button>
                            <div class="uk-form uk-form-horizontal uk-margin-top  ng-cloak" data-ng-show="importOptions.shown">
                                <fieldset class="uk-margin-top">
                                    <legend>@lang('import.label.All formats')</legend>
                                    <div class="uk-form-row">
                                        <label class="uk-form-label" title="Encoding compatible with FileReader API." data-uk-tooltip="{pos: 'bottom-left'}">
                                            @lang('import.label.Encoding')
                                        </label>
                                        <div class="uk-form-controls">
                                             <input type="text" class="uk-form-small" uk-form-width-min data-ng-model="importOptions.encoding" size="4" />
                                        </div>
                                    </div>
                                </fieldset>
                                <fieldset class="uk-margin-top">
                                    <legend>@lang('import.label.CSV specific')</legend>
                                    <div class="uk-form-row">
                                        <label class="uk-form-label" title="There is a header present in the data file" data-uk-tooltip="{pos: 'bottom-left'}">
                                            @lang('import.label.Has header')
                                        </label>
                                        <div class="uk-form-controls">
                                            <input type="checkbox" data-ng-model="importOptions.hasHeader" checked="checked" />
                                        </div>
                                    </div>
                                    <div class="uk-form-row">
                                        <label class="uk-form-label" title="Custom delimiter. Leave blank to auto-detect" data-uk-tooltip="{pos: 'bottom-left'}">
                                            @lang('import.label.Delimiter')
                                        </label>
                                        <div class="uk-form-controls">
                                            <input type="text" class="uk-form-small uk-form-width-min" data-ng-model="importOptions.delimiter" size="1" maxlength="1" />
                                        </div>
                                    </div>
                                    <div class="uk-form-row">
                                        <label class="uk-form-label" title="Custom newline. Leave blank to auto-detect" data-uk-tooltip="{pos: 'bottom-left'}">
                                            @lang('import.label.Newline')
                                        </label>
                                        <div class="uk-form-controls">
                                            <input type="text" class="uk-form-small" uk-form-width-min data-ng-model="importOptions.newline" size="4" maxlength="4" />
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                        </div>

                    </fieldset>
                </div>
            </div>


            <div class="uk-width-medium-1-2  ng-cloak" data-ng-show="collection && spreadsheetFile">
                <div class="app-panel">
                    <fieldset>
                        <legend>
                            <span class="uk-badge uk-badge-notification">3</span>
                            @lang('import.label.Processing')
                        </legend>

                        <div class="uk-form uk-form-horizontal uk-margin-bottom">
                            <div class="uk-form-row">
                                <label class="uk-form-label" for="import-processOptions-wipeOut" title="Remove all collection entries before import" data-uk-tooltip="{pos: 'bottom-left'}">
                                    @lang('import.label.Wipe out collection')
                                </label>
                                <div class="uk-form-controls">
                                    <input type="checkbox" data-ng-model="processOptions.wipeOut" id="import-form-processOptions-wipeOut" />
                                </div>
                            </div>
                            <div class="uk-form-row">
                                <label class="uk-form-label"  for="import-form-processOptions-offset" title="Offset to stat with" data-uk-tooltip="{pos: 'bottom-left'}">
                                    @lang('import.label.Offset')
                                </label>
                                <div class="uk-form-controls">
                                    <input type="number" min="0" max="" class="uk-form-small uk-form-width-min" size="3" required="required" id="import-form-processOptions-offset"
                                        data-ng-model="processOptions.offset"
                                        data-ng-change="changeOffset(processOptions.offset)"
                                        />
                                </div>
                            </div>
                            <div class="uk-form-row">
                                <label class="uk-form-label" for="import-form-processOptions-limit" title="Put zero for no limit" data-uk-tooltip="{pos: 'bottom-left'}">
                                    @lang('import.label.Limit')
                                </label>
                                <div class="uk-form-controls">
                                    <input type="number" min="0" max="" class="uk-form-small uk-form-width-min" size="3" id="import-form-processOptions-limit"
                                        data-ng-model="processOptions.limit"
                                        data-ng-change="changeLimit(processOptions.limit)"
                                        />
                                </div>
                            </div>
                            <div class="uk-form-row uk-hidden">
                                <label class="uk-form-label" for="import-form-processOptions-buffer" title="Number of simultanouts requests. Decrease if too many server errors." data-uk-tooltip="{pos: 'bottom-left'}">
                                    @lang('import.label.Buffer')
                                </label>
                                <div class="uk-form-controls">
                                    <input disabled="disabled" type="number" min="1" max="" class="uk-form-small uk-form-width-min" size="3" id="import-form-processOptions-buffer"
                                        data-ng-model="processOptions.bufferLength"
                                        />
                                </div>
                            </div>
                        </div>

                        <div class="uk-button-group">
                            <button type="submit" class="uk-button uk-button-primary"
                                data-ng-click="go()"
                                data-ng-disabled="process.started"
                            >
                                @lang('import.btn.Import')
                            </button>
                            <a class="uk-button uk-button-link" href="@route('collections/entries/')@@ collectionId @@">@lang('import.btn.Go to collection')</a>
                            <a class="uk-button uk-button-link" href="@route('/')">@lang('Cancel')</a>
                        </div>

                        <div
                            class="uk-progress uk-progress-success uk-progress-striped"
                            data-ng-class="{'uk-active': process.started == true}"
                            >
                            <div
                                class="uk-progress-bar"
                                data-ng-style="{'width': process.progress + '%'}"
                            >@@ process.progress + '%' @@</div>
                        </div>
                    </fieldset>
                </div>
            </div>
        </div>

        <div class="uk-grid  ng-cloak" data-ng-show="collection && spreadsheetFile">
            <div class="uk-width-medium-1-1">
                <div class="app-panel">

                    <fieldset data-ng-disabled="process.started">
                        <legend>
                            <span class="uk-badge uk-badge-notification">2</span>
                            @lang('import.label.Data mapping')
                        </legend>

                        <table class="uk-table uk-table-striped uk-table-condensed  import-table">
                            <colgroup>
                                <col width="25%"></col>
                                <col width="10%"></col>
                                <col span="2"></col>
                                <col width="25%"></col>
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>@lang('import.header.Label')</th>
                                    <th>@lang('import.header.Type')</th>
                                    <th>@lang('import.header.Import column')</th>
                                    <th>@lang('import.header.Filter')</th>
                                    <th>@lang('import.header.Output')</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="uk-table-middle" data-ng-repeat-start="row in dataMapper">
                                    <th rowspan="@@ 1 + (row.field.localize ? row.localizations.length : 0) + (row.field.slug ? 1 : 0) @@">

                                        <span>
                                            @@ row.field.label || row.field.name @@
                                        </span>

                                        <span class="uk-badge uk-badge-warning  ng-cloak" data-ng-show="row.field.required">required</span>
                                        <span class="uk-badge  ng-cloak" data-ng-show="row.field.slug">slug</span>
                                        <span class="uk-badge  ng-cloak" data-ng-show="row.field.localize">localize</span>

                                        <div class="uk-text-small uk-text-muted">
                                            @@ row.field.name @@
                                        </div>
                                    </th>
                                    <td>
                                        <code>@@ row.field.type @@</code>
                                    </td>
                                    <td>
                                        <select
                                            class="uk-width"
                                            data-ng-model="row.column"
                                            data-ng-options="column.value as column.label for column in row.availableColumns"
                                            data-ng-change="changeColumn(row, row.column)"
                                            data-ng-disabled="row.availableColumns.length == 1"
                                            >
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            class="uk-width"
                                            data-ng-model="row.filter"
                                            data-ng-options="filter.label for filter in row.availableFilters"
                                            data-ng-change="changeFilter(row, row.filter)"
                                            data-ng-disabled="row.column === undefined"
                                            >
                                        </select>
                                    </td>
                                    <td class="uk-text-break import-table-sample">
                                        @@ row.output @@
                                    </td>
                                </tr>
                                <!-- Localizations -->
                                <tr class="uk-table-middle" data-ng-repeat-end data-ng-if="row.field.localize" data-ng-repeat-start="localization in row.localizations">
                                    <td>
                                        <code>@@ row.field.type @@ (@@ localization.code @@)</code>
                                    </td>
                                    <td>
                                        <select
                                            class="uk-width"
                                            data-ng-model="localization.column"
                                            data-ng-options="column.value as column.label for column in row.availableColumns"
                                            data-ng-change="changeLocalizationColumn(row, localization, localization.column)"
                                            data-ng-disabled="row.availableColumns.length == 1"
                                            >
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            class="uk-width"
                                            data-ng-model="localization.filter"
                                            data-ng-options="filter.label for filter in row.availableFilters"
                                            data-ng-disabled="localization.column === undefined"
                                            >
                                        </select>
                                    </td>
                                    <td class="uk-text-small uk-text-truncate  import-table-sample">
                                        @@ localization.output @@
                                    </td>
                                </tr>
                                <!-- Slug -->
                                <tr class="uk-table-middle" data-ng-repeat-end data-ng-if="row.field.slug">
                                    <td>
                                        <code>slug</code>
                                    </td>
                                    <td>
                                        <select
                                            class="uk-width uk-form-small"
                                            data-ng-model="row.slugColumn"
                                            data-ng-options="column.value as column.label for column in row.availableColumns"
                                            data-ng-change="changeSlugColumn(row, row.slugColumn)"
                                            data-ng-disabled="row.availableColumns.length == 1"
                                            >
                                        </select>
                                    </td>
                                    <td></td>
                                    <td class="uk-text-small">
                                        <input
                                            type="text"
                                            readonly="readonly"
                                            class="import-form-noappearance"
                                            data-ng-model="row.slugOutput"
                                            data-app-slug="row.slugInput"
                                            />
                                            <!-- See app.module.js for appSlug options -->
                                    </td>
                                </tr>

                            </tbody>
                        </table>

                    </fieldset>

                </div>
            </div>
        </div>
    @else
        <div class="uk-alert-warning uk-alert-large">
            <h2>@lang('import.title.No collections')</h2>
            <p>
                <a href="@route('collections/collection')">@lang('import.title.Click here to create one')</a>
            </p>
        </div>
    @endif
</div>
