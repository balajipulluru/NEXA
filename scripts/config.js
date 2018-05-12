//----------------------------------------------------------------------------
// Config settings for NEXA Logic WorkBench
//----------------------------------------------------------------------------

var via_WBM = true;

var autoInitialize = 1;

// NEXA Manager url
var workbench_manager_url = 'http://edagl12k.pok.ibm.com:5003';

// NEXA Mantis app wrapper url
var application_wrapper_url = 'http://edagl12k.pok.ibm.com:8084'

// NEXA Application ids
var wb_integration_app_id_map = { calculator: '594779446625405c39f780e0',
				  mantis: '594779446625405c39f780e0'
        };

var helper_process_cell_select_override = true;

// Cell where NEXA is installed
// Right now, officially only installed on apd cell
var install_cell = 'apd';

// To get install location of nexa on the client side
// var trace_file.resizable = true;
// var source_browser.resizable = true;
// var mantis.resizable = true;
// var nexa_analyzer.resizable = true;
var install_path = "/afs/eda.fishkill.ibm.com/u/bpulluru/VolumeNexa/May08/NEXA-AutoInstaller";

