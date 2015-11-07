<?php
namespace Import\Controller;

/**
 * Base module controller
 */
class Import extends \Cockpit\Controller
{
    /**
     * Module start page
     */
    public function index()
    {
        // $config = cockpit('import')->getConfig();
        $docs = $this->app->db->find('common/collections', []);
        $locales = $this->app->db->getKey("cockpit/settings", "cockpit.locales", []);
        $selected = $this->getSelectedCollection($docs);

        // data: name, sortfield, sortorder, slug, _id
        return $this->render('import:views/index.php', [
            'collections'  => $docs->toArray(),
            'locales'      => $locales,
            'collectionId' => $selected['_id'],
        ]);
    }

    /**
     * Get collection which should be preselected from referring page.
     *
     * @param MongoHybrid\ResultSet $docs
     * @return array|null
     */
    protected function getSelectedCollection($docs)
    {
        if (!isset($_SERVER['HTTP_REFERER'])) {
            return null;
        }

        foreach ($docs->toArray() as $doc) {
            if ($_SERVER['HTTP_REFERER'] == $this->app['site_url'] . $this->app->routeUrl('collections/entries/' . $doc['_id'])) {
                return $doc;
            }
        }

        return null;
    }
}
