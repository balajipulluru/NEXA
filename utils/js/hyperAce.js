angular.module('HyperAceModule',[])
/**
 * creates a hypersearch instance
 * @param {Editor} editor  the editor
 * @param {string} search the search pattern if provided will be used to
                          initialze search. Also two way binding also the parent
                          scope to monitor the search pattern if needed.
 */
.directive('hyperAce',function(){
  return {
    restrict: 'E',
    scope:{
      editor: '=',
      search: "=",
    },
    controller: function ($scope,$timeout,$q) {
        let hyperace = this;
        hyperace.hypersearch = function(editor, options) {
            hyperace.activeEditor = 0 ;   // index to editors array
            hyperace.ranges = null ;      // the results of ranges to display
            hyperace.anchors = [] ;  // floating anchors that we jump to when a result is selected
            hyperace.currentSession = 0 ; // the current edit session identifier
            hyperace.editor = editor;
            hyperace.searchMultiSession = false;
            hyperace._acebox(); // using default search input as ace search box
            hyperace.options = options ? options : [];
            hyperace.ranges_exceed = false;
            hyperace.aceRange = ace.require('ace/range').Range;
            if (options) {
                hyperace.options['matchclass'] = options['matchclass'] ? options['matchclass'] : 'hyperace-match';
                hyperace.options['lineclass'] = options['lineclass'] ? options['lineclass'] : 'hyperace-line';
            } else {
                hyperace.options['matchclass'] = 'hyperace-match';
                hyperace.options['lineclass'] = 'hyperace-line';
            }
            hyperace.sessions = Array(editor.getSession());                  // set for single session, over-ridden for multi
            hyperace._anchorValidation(0);
            if($scope.search)
            {
              $timeout(function(){
                hyperace.search($scope.search);
                hyperace.textbox.value = $scope.search;
              },3000);
            }
        };
        /**
         * set sessions for multiple session search
         * @param {Array<EditSession>} sessions array of ace.EditSession objects with the key as named identifier
         */
        hyperace.setSessions = function (sessions) {
            var hold = hyperace.sessions;
            hyperace.sessions = sessions;
            for (s in hyperace.sessions) {
                hyperace.currentSession = s;
                break; // just setting to first one
            }

            for (s in hyperace.sessions) {
                var sessionok = true;
                for(h in hold) {
                    if(hold[h] == hyperace.sessions[s]) {
                        sessionok = false; // already exists, do not want to add event handler
                        break;
                    }
                }
                if(sessionok) {
                    hyperace._anchorValidation(s);
                }
            }
        };

        /**
         * update the session for hyper-ace and ace
         * @param {string} identifier the identifer for the session to set
         */
        hyperace.setSession = function (identifier) {
            hyperace.editor.setSession(hyperace.sessions[identifier]);
            hyperace.currentSession = identifier;
        };

        /**
         * set ace editor search options
         * @param {object} options search options, true or false for any of (regExp, caseSensitive or wholeWord)
         */
        hyperace.set = function (options) {
            hyperace.editor.$search.set(options);
        };

        /**
         * clears search results
         */
        hyperace.clear = function () {
            hyperace.ranges = [];
            hyperace.anchors = [];
        };

        /**
         * search across multiple sessions
         */
        hyperace.searchSessions = function () {
            hyperace.ranges = [];
            hyperace.anchors = [];
            var editor = hyperace.editor;
            var hold = editor.getSession();
            for (s in hyperace.sessions) {
                hyperace.anchors[s] = [];
                hyperace._search(hyperace.sessions[s], s);
                if (hyperace.ranges[s].length == 0) {
                    hyperace.target.removeChild(session)
                }
            }
            editor.setSession(hold);
        };

        /**
         * search the current session
         */
        hyperace.search = function (searchExp='') {
            hyperace.ranges = [];
            hyperace.anchors = [];
            hyperace.anchors[hyperace.currentSession] = [];
            hyperace.ranges[hyperace.currentSession]=[];
            hyperace._search(hyperace.editor.getSession(), hyperace.currentSession,searchExp);
            hyperace.results = hyperace.ranges[this.currentSession].length;
        };

        function filter_data_for_block(block_range,searchExp,s)
        {
          var defer = $q.defer();
            // console.log("executing range",block_range);
          $timeout(function(){
            if(hyperace.ranges_exceed)
            {
              defer.resolve("range exceeds");
              return;
            }
                if(hyperace.editor.findAll(searchExp,{range:block_range})>0) {
                var index = hyperace.anchors[s].length;
                var temp_ranges = hyperace.editor.getSelection().getAllRanges();
                hyperace.editor.exitMultiSelectMode();
                for (r = 0; r < temp_ranges.length; r++) {
                  if(hyperace.ranges_exceed)
                  {
                    defer.resolve("result exceeded");
                    return;
                  }
                    hyperace.anchors[s].push(hyperace.editor.getSession().getDocument().createAnchor(temp_ranges[r].start.row, temp_ranges[r].start.column));
                    hyperace._addResult(index+r, s, temp_ranges[r]);
                  }
                  hyperace.editor.clearSelection();
                defer.resolve("success");
              } else {
                defer.resolve("no matches found");
              }
            },(block_range.start.row*25)/$scope.window_width)
          return defer.promise;
        }
        /** improve search performance
          window by window based search
        **/
        hyperace._findAll =  function(searchExp,s){
          var editor = hyperace.editor;
          $scope.window_width = 5000;
          var session = editor.getSession();
          var lastRow = session.getLength()-1;
          var i=0;
          var windowed_ranges = new Array();
          var no_of_windows = Math.round(lastRow/$scope.window_width);
          if(no_of_windows>=1) {
            for(i=0;i<no_of_windows;i++)
            {
              var new_range = new hyperace.aceRange(i*$scope.window_width,0,i*$scope.window_width+$scope.window_width-1,0);
              windowed_ranges.push(new_range);
            }
          }
          if(lastRow%$scope.window_width!=0)
          {
            var new_range = new hyperace.aceRange(no_of_windows*$scope.window_width,0,no_of_windows*$scope.window_width+lastRow%$scope.window_width,0);
            windowed_ranges.push(new_range);
          }
          var promises = []
          angular.forEach(windowed_ranges,function(window_range,index,obj){
            promises.push(filter_data_for_block(window_range,searchExp,s));
          });

          $q.all(promises).then(function (results) {
            console.log('all promises served',results);
            hyperace.results=hyperace.ranges[hyperace.currentSession].length;
              // console.log("data ",new_data);
           });
        }

        /**
         * performs the search and sets ranges and anchors
         * @param {EditSession} session the session to search
         * @param {string} s session identifier
         * @private
         */
        hyperace._search= function (session, s,searchExp) {
            var editor = hyperace.editor;
            hyperace.ranges_exceed = false;
            if (session) editor.setSession(session);
            if(searchExp!=''){
              // var found = editor.findAll(searchExp);
              hyperace._findAll(searchExp,s);
            } else {
              // var found = editor.findAll(this.textbox.value);
              hyperace._findAll(this.textbox.value,s);
              $scope.search = this.textbox.value;
            }
            // if(found==0) editor.clearSelection();
            // var temp_ranges = editor.getSelection().getAllRanges();
            // editor.exitMultiSelectMode();
            // for (r = 0; r < temp_ranges.length; r++) {
            //     hyperace.anchors[s].push(editor.getSession().getDocument().createAnchor(temp_ranges[r].start.row, temp_ranges[r].start.column));
            //     hyperace._addResult(r, s, temp_ranges[r]);
            // }
        };

        /**
         * add a search result to component
         * @param {int} index the index where the range and anchor info is stored
         * @param {string} sessionName the session indentifier for retrieving range and anchor info
         * @private
         */
        hyperace._addResult = function (index, sessionName,range) {
            if (range.start.row == range.end.row && range.start.column == range.end.column) {
                hyperace.ranges[sessionName] = [];
                return; // empty result
            }
            var line = range.start.row;
            var col = range.start.column;
            var rawline = hyperace.editor.getSession().getLine(line);
            var pre = rawline.substr(0, col);
            var match = rawline.substr(col, range.end.column - col);
            var post = rawline.substr(range.end.column);
            //var resultline = _htmlEncode(pre) + '<span class="' + this.options.matchclass + '">' + _htmlEncode(match) + '</span>' + _htmlEncode(post);
            hyperace.ranges[sessionName][index] = {
              range:range,
              data:{
                pre:pre,
                post:post,
                match:match
              }
            };
          if(hyperace.ranges[sessionName].length>2000)
          {
            hyperace.ranges_exceed = true;
          }
        };

        /**
         * this is called from the link's event listener whenever a search result link is clicked
         * @param {Number} index index to the result anchor
         * @param {Element} sessionNo the editor session of the result interested
         */
        hyperace._linkSelected = function (index, sessionNo) {
            var editor = hyperace.editor;
            var pos = hyperace.anchors[sessionNo][index].getPosition();
            var linkSession = sessionNo;

            if(linkSession != hyperace.currentSession) {
                hyperace.currentSession = linkSession;
                hyperace.setSession(this.currentSession);
            }
            editor.focus();
            editor.moveCursorTo(pos.row, pos.column);
            editor.scrollToLine(pos.row);
            var range = hyperace.ranges[linkSession][index].range;
            editor.selection.setRange(new hyperace.aceRange(pos.row, pos.column, pos.row, range.end.column + pos.column - range.start.column));
        };

        /**
         * creates ace default searchbox as the hypersearch box with optional callback
         * @private
         */
        hyperace._acebox = function () {
            var self = hyperace;
            // undocumented ace function, used so we can initialize on callback of searchbox load to pass to hyper-ace
            ace.config.loadModule("ace/ext/searchbox", function(e) {
                e.Search(self.editor); // set to editor component
                self.textbox = self.editor.container.getElementsByClassName('ace_search_field')[0]; // get texbox element
                self.button = self.editor.container.getElementsByClassName('ace_searchbtn');
                if(self.button && self.button.length>0)
                {
                  for(var i=0,length=self.button.length;i<length;i++)
                  {
                    if((self.button[i].innerHTML=='All') && (self.button[i].title == 'Alt-Enter'))
                    {
                      self.button[i].title = 'Enter';
                      self.button[i].textContent = 'Filter';
                      self.button[i].addEventListener("click", function(event){
                        if(self.textbox.value!=$scope.search){
                           if (self.searchMultiSession) {
                                  self.searchSessions();
                              } else {
                                  self.search();
                            }
                         }
                         setTimeout(function(){self.editor.execCommand("find")},100);
                      });
                    }
                  }
                }
                // self.button = self.editor.container.getElementsByClassName('ace_searchbtn_close');
                // if(self.button && self.button.length>0)
                // {
                //   for(var i=0,length=self.button.length;i<length;i++)
                //   {
                //     self.button[i].hidden = true;
                //   }
                // }
                self.textbox.id = 'hyperbox'; // hyperace needs id, so we set it for the search box
                self.textbox.addEventListener('keyup', function (e) { // look for tab key in search box
                if (e.keyCode == 13) {
                  if(self.textbox.value!=$scope.search){
                          if (self.searchMultiSession) {
                              self.searchSessions();
                            } else {
                              self.search();
                            }
                          }
                    }
                });
                self.editor.container.getElementsByClassName('ace_search')[0].style.display = 'none';
                if(self.options) {
                    if (typeof self.options.load == 'function') {
                        self.options.load(e);
                    }
                }

            });

        };

        /**
         * adds listener to check for when an anchor goes invalid
         * @param {string} s the session identifier
         * @private
         */
        hyperace._anchorValidation = function (s) {
            var self = hyperace;
            hyperace.sessions[s].on('change', function (e) {
                var delta = e.data;
                if (delta && (delta.action === "removeText" || delta.action === "removeLines")) {
                    var range = delta.range;

                    for(a in self.anchors[self.currentSession]) {
                        var anchor = self.anchors[self.currentSession][a];
                        if (
                            (delta.action === "removeText" && range.end.column > anchor.column &&
                                range.start.row === anchor.row && range.start.column <= anchor.column)
                                ||
                                (delta.action === "removeLines" && range.start.row <= anchor.row &&
                                    range.end.row > anchor.row)
                            ) {
                            self.anchors[self.currentSession][a].detach();
                            var r = self._getResult(self.currentSession, a);
                            if(r) {
                                r.parentNode.removeChild(r);
                            }
                        }
                    }
                }
            });

        };
        hyperace.hypersearch($scope.editor);
    },
    controllerAs:'hyperace',
    templateUrl:'../utils/views/hyperAce.html'
  };
});
