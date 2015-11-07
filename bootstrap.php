<?php
/**
 * Module bootstrap
 */

// ADMIN
if (COCKPIT_ADMIN && !COCKPIT_REST) {
    // Set error reporting (Enable ONLY for debugging)
    // error_reporting(E_ALL);
    // ini_set('display_errors', true);

    include_once __DIR__ . '/admin.php';
}
