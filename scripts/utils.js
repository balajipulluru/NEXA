angular.module('utils',[])
.directive('showTail', function () {
  return function (scope, elem, attr) {
      scope.$watch(function () {
          return elem[0].value;
      },
      function (e) {
          elem[0].scrollTop = elem[0].scrollHeight;
      });
  }
})
//Service to read directories and get files
.service('DirService',function(sharedModelServices,$http,$q){
  /*get files form the directive provided
  @filePath - the directory where the files need to searched
  @filter - filter used to control list of files provided*/

  this.getfiles = function(filePath,filter='',cell='',user=''){
    var q = $q.defer();
    console.log("getfiles",filePath,filter);
    //get afsid and password
    if((cell =="")||(user =="")){
      var user_info = sharedModelServices.intra_getValue("USER_INFO");
      if(cell =="") {
       cell= user_info["cell"];
     }
     if(user =="") {
      user = user_info["user"];
    }
    }
   var file_list = [];
   var file_names = [];
   var filter_provided = (filter !="");
    $http.get('/ReadDir/?dirPath='+filePath +'&afsId=' + user + '&cell=' + cell).success(function(response){
      if(response.rc==0){
        var data = response.data;
        file_list = data.split(",");
        for (var i=0;i<file_list.length;i++)
        {
          if(file_list[i] != ""){
            if(filter_provided){
              console.log(file_list[i]);
              if(file_list[i].match(filter)){
                file_names.push(file_list[i]);
              }
            }else {
              file_names.push(file_list[i]);
            }
          }
        }
        q.resolve(file_names);
      } else {
        q.reject(response.data);
      }
      });
    return q.promise;
  };
  //update the session model for additional directories and the current file selected
  this.updateSessionModel = function(filePath,fileType) {
    var cqDebugInfo = sharedModelServices.intra_getValue("CQ_DEBUG_INFO");
    var adSrchDirectory = cqDebugInfo.additional_search_dir;
    var logic_debug_dir = cqDebugInfo.logic_debug_dir;
    var dir = filePath.substr(0, filePath.lastIndexOf("/") );

    var files_selected = cqDebugInfo.files_selected;
    files_selected[fileType] = filePath;
    sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","files_selected",files_selected);
    if(!logic_debug_dir){
      sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","logic_debug_dir",dir);
      return;
    }
    if(!adSrchDirectory)
    {
      sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","additional_search_dir",dir);
    } else {
      if((adSrchDirectory.indexOf(dir)==-1) && (logic_debug_dir.indexOf(dir)==-1) ) {
          adSrchDirectory = adSrchDirectory + "," + dir;
          sharedModelServices.intra_insertKeyValue("CQ_DEBUG_INFO","additional_search_dir",adSrchDirectory);
      }
    }
  }
});
