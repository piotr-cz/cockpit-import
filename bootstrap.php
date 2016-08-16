<?php
/**
 * Module bootstrap
 */

// ADMIN
if (COCKPIT_ADMIN && !COCKPIT_REST) {

    include_once __DIR__ . '/admin.php';
}
