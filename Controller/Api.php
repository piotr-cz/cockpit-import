<?php
namespace Import\Controller;

/**
 * API module controller
 */
class Api extends \Cockpit\Controller
{
    /**
     * Get import options
     *
     * @return stdClass
     */
    protected function getImportOptions()
    {
        return (object) array_merge(
            [
                'hasHeader' => true,
                'delimiter' => ',',
                'enclosure' => '"',
                'escape'    => '\\',
                'newline'   => "\n",
                'encoding'  => 'UTF-8',
            ],
            $this->param('importOptions', [])
        );
    }

    /**
     * Auto-detect newlines (chr 13: CR, 10: LF)
     *
     * @param string
     *
     * @return string
     */
    protected function detectNewline($string) {

        // Windows
        if (strpos($fileData, "\\r\\n") !== false) {
            return "\r\n";
        // Unix
        } elseif (strpos($fileData, "\r") !== false) {
            return "\r";
        // Old Mac
        } elseif (strpos($fileData, "\n") !== false) {
            return "\n";
        }
    }

    /**
     * Parse CSV string to array
     *
     * @return string
     */
    public function parseString()
    {
        $fileData = $this->param('fileString');

        if (empty($fileData)) {
            return '{"success":false}';
        }

        $importOptions = $this->getImportOptions();

        $newline = ($importOptions->newline)
            ? $importOptions->newline
            : $this->detectNewline($fileData)
        ;

        // Parse rows
        $data = str_getcsv($fileData, $newline);

        // Parse cells
        foreach ($data as &$row) {
            $row = str_getcsv(
                $row,
                $importOptions->delimiter,
                $importOptions->enclosure,
                $importOptions->escape
            );
        }

        // Prepare header
        $header = ($importOptions->hasHeader)
            ? array_shift($data)
            : range(0, count($row))
        ;

        unset ($row);

        return json_encode([
            'success' => true,
            'data' => [
                'header' => $header,
                'table'  => $data,
            ],
        ]);
    }

    /**
     * Create data mapping
     *
     * @return string
     */
    public function prepare()
    {
        $data = str_getcsv($fileData, ',', '"', '\\');

        // Load posted file

        $importOptions = (object) $this->param('importOptions', []);
        $fileName  = '';

        if ($handle = fopen($fileName, 'r') === false) {
            return false;
        }

        $row    = 0;
        $header = [];
        $data   = [];

        while ($data = fgetcsv($handle, 0, ',', '"', '\\') !== false) {

            $data[++$row] = $data;
        }

        if ($importOptions->hasHeader) {
            $header = array_shift($data);
        }

        return json_encode([
            'header' => $header,
            'data'   => $data,
        ]);
    }

    /**
     * Import data
     */
    public function import() {

        $importOptions = (object) $this->param('importOptions', []);
    }
}
