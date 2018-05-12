angular.module('eda-helperprefs',["helper"])
.value('auth-server-url',"http://edaa.pok.ibm.com/auth")
.factory('eda.helperprefs',['$http','$rootScope','$window','Helper','auth-server-url', function($http,$rootScope,$window,findHelper,authUrl) {

  var cte_info = {
    celllist: ["apd", "eda", "awd", "rchland", "vlsilab" ],
    cells: { bb: "vlsilab" }
  };
  for (var i in cte_info.celllist) {
    cte_info.cells[cte_info.celllist[i]] = cte_info.celllist[i];
  }
  var helperObj = {
    prefsurl: authUrl + "/userprefs",
    prefsp: null,
    prefs: function(force) {
      if (force) { helperObj.prefsp = null; }
      if (!helperObj.prefsp) {
        helperObj.prefsp = new Promise(function(resolve,reject) {
          $http.get(helperObj.prefsurl).then(function(response) {
            resolve(response.data);
          }).catch(function(err) {
            reject(err);
          });
        });
      }
      return helperObj.prefsp;
    },
    file2cell: function(fname) {
      var x = fname.replace(/^\/afs\//,"").replace(/[./].*/,"");
      return cte_info.cells[x];
    },

    celldata : {},

    testHelper: function(cdata) {
      $http.get(cdata.url).then(function(res) {
        console.log("helper is alive!",res);
        cdata.status = "alive";
        var previnfo = cdata.helperinfo;
        cdata.helperinfo  = res.data;
        cdata.tokens = [];
        for (var c in cdata.helperinfo.tokens) { cdata.tokens.push(cdata.helperinfo.tokens[c].cell); }
        if (!previnfo) { // first time checking in
          cdata.resolve(cdata);
        }
      }).catch(function (err) {
        console.log("helper",cdata.url,"error",err);
        cdata.status = "dead?";
        delete cdata.url;
        $rootScope.$applyAsync();
        helperObj.cleanHelper(cdata);
      });
    },
    cleanHelper: function(cdata) {
      var helperid = cdata.cell + "_" + cdata.userid;
      cdata.status="cleaning up "+helperid;
      //      $http.delete(helperObj.locateurl+helperid).then(
      findHelper.deleteById({id: helperid},function(value,res) {
        console.log("delete",helperid,"is back with status",value);
        cdata.status="deleted.";
        delete cdata.pid;
        delete cdata.url;
        delete cdata.helperinfo;
        helperObj.locateHelper(cdata);
      },function(err) {
        console.log("helper delete",helperid,"errored with status",err);
      });
    },
    locateHelper: function(cdata) {
      var helperid = cdata.cell + "_" + cdata.userid;
      cdata.status="looking for "+helperid;

      // $http.get(helperObj.locateurl+helperid).then(function(res) {
      findHelper.findById({id: helperid},function(value,res) {
        console.log("found helper",value);
        cdata.pid = value.pid;
        cdata.url = value.url;
        helperObj.testHelper(cdata);        
      },function(err) {
        console.log("problem finding helper",err);
        cdata.status = "need intervention";
        $rootScope.$broadcast('helper.needcell',{cell: cdata.cell, user: cdata.userid, helper: helperObj});
      });
    },
    verifyHelper: function(cdata) {
      var helperid = cdata.cell + "_" + cdata.userid;
      cdata.status="verifying "+helperid;

      // $http.get(helperObj.locateurl+helperid).then(function(res) {
      findHelper.verify({helperName: helperid, wait: 120,debug:true, verifyOptions:""},function(value,res) {
        console.log("verify helper response",value);
        helperObj.locateHelper(cdata);
      },function(err) {
        console.log("problem finding helper",err);
        cdata.status = "need intervention";
        $rootScope.$broadcast('helper.needcell',{cell: cdata.cell, user: cdata.userid, helper: helperObj});
      });
    },
    retry: function(cell) {
      if (helperObj.celldata[cell]) {
        helperObj.locateHelper(helperObj.celldata[cell]);
      }
    },
    abort: function(cell,reason) {
      if (helperObj.celldata[cell]) {
        var reject = helperObj.celldata[cell].reject;
        delete helperObj.celldata[cell];
        reject(reason);
      }
    },
    helperDialog: function($mdDialog,cell,userid) {
      var hint = "&cell=" + encodeURIComponent(cell);
      if (userid) {
        hint += "&userid="+ encodeURIComponent(userid);
      }
      var targetUrl = authUrl + "/helperform?targetUrl=closehelper"+hint;
      function diaCtl($scope,$mdDialog) {
        //var hint = "&cell=" + encodeURIComponent(cell);
        //if (userid) {
        //hint += "&userid="+ encodeURIComponent(userid);
        //}
        //$scope.target = authUrl + "/helperform?targetUrl=closehelper"+hint;
      }
      var dialog_info = {
        controller: diaCtl,
        height: "80%",
        template: '<md-dialog aria-label="helper dialog" style="width:80%; height: 80%"><iframe src="'+targetUrl+'" width="100%" height="100%"></iframe></md-dialog>'
      };

      function diaTakedown(e) {
	console.log("a message!",e);
        if (e.data.helper) {
          $mdDialog.hide(e.data);
        } else {
          $mdDialog.cancel();
        }
	$window.removeEventListener("message",diaTakedown);
      }
      
      $window.addEventListener("message",diaTakedown);

      $mdDialog.show(dialog_info).then(function(result) {
        console.log("yes",result);
	//helper.sethelper(result.cell,result.userid);
        var cdata = helperObj.celldata[cell];
        if (!cdata) {
          console.log("helper dialog without a prior request?");
          return;
        }
        if (result.cell !== cell) {
          console.log("forcing helper for cell",cell,"to",result.cell);
        }
        cdata.cell = result.cell;
        cdata.userid = result.userid;
        helperObj.verifyHelper(cdata);
      },function(err) {
        $rootScope.$broadcast('helper.dialogcancelled',{cell: cell, user: userid, helper: helperObj});
      });
    },
    helper: function(cell,userid_hint) {
      if (!(cell in helperObj.celldata)) {
        var cdata = { cell: cell };
        helperObj.celldata[cell] = cdata;
        cdata.promise = new Promise(function (resolve,reject) {
          cdata.resolve = resolve; cdata.reject = reject;
          cdata.status = "requested";
          if (userid_hint) {
            cdata.userid = userid_hint;
            helperObj.locateHelper(cdata);
          } else {
            helperObj.prefs().then(function(prefs) {
              if (cdata.userid) { return; } // someone has filled it in meanwhile
              if (prefs.cellinfo[cell].id) {
                cdata.userid = prefs.cellinfo[cell].id;
              } else {
                cdata.userid = prefs.cellinfo[cell].ids[0];
                cdata.guess = true;
              }
              $rootScope.$applyAsync();
              helperObj.locateHelper(cdata);
            });
          }
        });
        
      }
      return helperObj.celldata[cell].promise;
    }
    
  };
  
  return helperObj;
}]);
