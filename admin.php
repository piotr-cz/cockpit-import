<?php
/**
 * Admin definitions
 */

// Helper
$app->helpers['import'] = 'Import\\Helper\\Import';

$app->on('admin.init', function() use ($app) {

    if (!$this->module('auth')->hasaccess('import', ['manage.import', 'manage.entries'])) {
        return;
    }

    // Set controller and module route.
    $app->bindClass('Import\\Controller\\Import', 'import');
    $app->bindClass('Import\\Controller\\Api', 'api/import');

    // Menu item
    $app('admin')->menu('top', [
        'url'    => $app->routeUrl('/import'),
        'label'  => '<i class="uk-icon-file-excel-o"></i>',
        'title'  => $app('i18n')->get('Import'),
        'active' => (strpos($this['route'], '/import') === 0)
    ], -1);

    // Load i18n file
    // All loaded strings will be available in frontend using App.i18n.get function
    $locale = $app("i18n")->locale;
    $app('i18n')->load("modules:addons/Import/i18n/en.php");
});

/*
// Register new content fields
$app->on('cockpit.content.fields.sources', function() {

    // Need this to load other dependencies (Contentfields)
    echo $this->assets([
        'import:assets/field.fileread.js',
    ], $this['cockpit/version']);
});
*/
