/**
 * Created by nitseg1 on 3/26/2017.
 */

const Jasmine = require('jasmine');
const jasmine = new Jasmine;

jasmine.loadConfig({
        spec_dir: 'specs',
        spec_files: [
            '**/*.spec.js'
        ]
    }
);

jasmine.execute();