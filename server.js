/////////////////////////////////////////////////////////////////////////////////////////////
// NEXA Logic WorkBench Node Server
/////////////////////////////////////////////////////////////////////////////////////////////

//var common = require('./public/ldap_auth/eda-ldap-api/modules/eda-api-common');
//var config = common.config();
var express = require('express');    
var compression = require('compression');
var bodyParser = require('body-parser');
var fs = require('fs.extra');
var app = express();
var Helper = require('helper');

var session_data = __dirname + '/NexaSessionModel';
var global_data =  __dirname + '/NexaInterSessionSharedModel/';

if (!fs.existsSync(session_data)){
  console.log("[NEXA Logic WorkBench] (I): Creating NexaSessionModel directory at %s", session_data);
  fs.mkdirSync(session_data);
}

if (!fs.existsSync(global_data)){
  console.log("[NEXA Logic WorkBench] (I): Creating NexaInterSessionSharedModel directory at %s", global_data);
  fs.mkdirSync(global_data);
}

// A map of session id - data in the body from workbench manager
var session_id_data_map = new Map();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Authenticate the login user - start
/*var ldapApi = require('./public/ldap_auth/eda-ldap-api')(app, app)
console.log("(D): app.js - before /login  - __dirname - "+__dirname);
app.get('/', ldapApi.ensureAuthenticated, function(req, res) {
   console.log("(D):  app.js - get('/'). - __dirname - "+__dirname);
   res.sendFile('public/index.html', {root: __dirname});
});*/
// Authenticate the login user - End

app.use(express.static(__dirname + '/public'));
//app.use('/',route_auth.if_logged_in_redir(),express.static(__dirname + '/public'));
//app.use('/bower_components', express.static(__dirname + '/public/components'));
app.use('/components', express.static(__dirname + '/public/components'));
//app.use('/components',route_auth.if_logged_in_redir(),express.static(__dirname + '/public/components'));

// Interface create,storage and retrieval logic/routes - start
var encoding = 'utf8';
app.get('/NexaAdfModel/:sessionId', function(req, res, next){
  var storeDir = session_data + "/NexaSession-" + req.params.sessionId + "/NexaAdfModel/";
  // console.log("store dir "+ storeDir);

  fs.readdir(storeDir, function(err, files){
    if (err) {
      return next(err);
    }
    var boards = [];
    files.forEach(function(file){
      try {
        var json = JSON.parse(fs.readFileSync(storeDir + file, encoding));
      } catch (e) {
        // console.log("JSON parsing error");
        json = undefined;
        // continue;
      }
      if(json) {
        boards.push({
          id: file.replace('.json', ''),
          title: json.title
        });
      }
    });
    // send response
    res.json({
      dashboards: boards
    });
  });
});

app.get('/NexaIntraSessionSharedModel/:sessionId/:id', function(req, res, next){
   var storeDir1 = session_data + "/NexaSession-" + req.params.sessionId + "/NexaIntraSessionSharedModel/";
   fs.readFile(storeDir1 + req.params.id + '.json', encoding, function(err, data){
    if (err) {
      // console.log('error',err);
         return next(err);
	}
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(data);

  });
});

/*
app.post('/data/helper/:cell/:user',auth_stack, function(req,res) {
                var pw = req.body.password;
                if (!pw) { res.status(403).send("currently need password"); }
                helper.start(cte_info.cells[req.params.cell].getllmach,req.params.cell,req.params.user,null,true,function(err,info) {
                    if (err) { res.status(err.status).send(err);
                    } else {
                        res.send(info);
                    }
                });
            });*/


app.get('/helper_start/:cell/:user',function(req,res){
  console.log("[NEXA Logic WorkBench] (I): NEXA helper start ...");
      console.log(req.params.cell);
      console.log(req.params.user);
      Helper.locate("eda","arunj",function(err,info) {
                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                        else {
                       console.log(info);
                       res.send(info);
                    }
                });
});


// app.get('/helper/*/',function(req,res){
//     var dir = (req.path).split("//");
//     var cq_dir = "/" + dir[1];
//     var user = dir[2];
//     var cell = dir[3];
//     //console.log("Comes Here in helper",cq_dir,user,cell,req.path);
//     Helper.execute("ls", [cq_dir], cell, user,req,function(value,response) {
//    if(value){
//         console.log("[NEXA] (E): Could not read directory "+cq_dir,value,response);
//         res.status(204).end();
//       } else {
//      //console.log("[NEXA] (I): Success data ",response);
//         res.send(JSON.stringify(response.stdout));
//    }
//
//      });
//
//
// });


app.get('/ReadDir/',function(req,res){
    var dirPath = req.query.dirPath;
    var afsid = req.query.afsId;
    var cellName =  req.query.cell;
    Helper.readdir(dirPath,"", cellName, afsid,req,function(value,response) {
	    
   if(value){
        console.log("[NEXA Logic WorkBench] (E): Could not read directory", value, response);
        res.send({"rc":-1,"data":response});
      } else {
     //console.log("[NEXA] (I): Success data ",response);
       if(response.indexOf("ENOENT")>=0){
         res.send({"rc":-1,"data":response});
       } else {
        res.send({"rc":0,"data":response});
      }
    }
     });
});


//execute any string passed to it using helper
app.get('/remoteExecute/',function(req,res){
    var cmd = req.query.cmd;
    var args = req.query.args;
    var afsid = req.query.afsId;
    var cellName =  req.query.cell;
    // console.log("[NEXA Logic WorkBench] (I): Executing remote command cmd=" + cmd + " for", afsid, cellName);
	
    Helper.execute(cmd, [args], cellName, afsid,req,function(value,response) {
      if(value){
          console.log("[NEXA Logic WorkBench] (E): NEXA remoteExecute error executing cmd "+cmd,value,response);
          res.status({"rc":-1,"data":response});
      } else {
	//console.log("[NEXA Logic WorkBench] (I): NEXA remoteExecute success data ", response);
          res.send({"rc":0,"data":response});
      }
    });
});


app.get('/readFile/',function(req,res){
  var filePath = req.query.filePath;
  var afsid = req.query.afsId;
  var cellName =  req.query.cell;
  
    if(filePath.indexOf(".gz")>0) {
      Helper.execute("zcat", [filePath], cellName, afsid,req,function(value,response) {
		       if(value){
			 console.log("[NEXA Logic WorkBench] (E): Error reading read file "+filePath,value,response);
			 res.status({"rc":-1,"data":response.stderr});
		       } else {
			 //console.log("[NEXA Logic WorkBench] (I): Success data", response);
			 res.send({"rc":0,"data":response.stdout});
		       }

		     });
    } else {
    Helper.read(filePath,"", cellName, afsid ,req,function(value,response) {
		     if(value && value!=null){
		       console.log("[NEXA Logic WorkBench] (E): Error reading file at "+filePath,value);
		       res.status({"rc":-1,"data":response});
		     } else {
		       res.send({"rc":0,"data":response});
		     }
		});
    }

});


app.get('/read_dir/*/',function(req,res){
    var dir = (req.path).split("//");
    var cq_dir = "/" + dir[1];
    var filepath = cq_dir  +'/'+dir[2];

    Helper.read(filepath,"", "eda", "shareddy",req,function(value,response) {
		  if(value && value!=null){
		    console.log("[NEXA Logic WorkBench] (E): Error reading dir at "+filepath,value);
		    res.status(204).end();
		  } else {
		    res.send(response);
		  }
		});

	});


app.post('/NexaIntraSessionSharedModel/:sessionId/:id', function(req, res, next){
 var storeDir1 = session_data + "/NexaSession-" + req.params.sessionId + "/NexaIntraSessionSharedModel/";
  fs.writeFile(
    storeDir1 + req.params.id + '.json',
    JSON.stringify(req.body, undefined, 2),
    function(err){
      if (err) {
        return next(err);
      }
      res.status(204).end();
    }
  );
});

app.get('/NexaInterSessionSharedModel/:id', function(req, res, next){

     var storeDir2 = global_data ;


  fs.readFile(storeDir2 + req.params.id + '.json', encoding, function(err, data){

    if (err) {
      //return next(err);
    }

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(data);

  });
});

app.post('/NexaInterSessionSharedModel/:id', function(req, res, next){
 var storeDir2 = global_data;
  fs.writeFile(
    storeDir2 + req.params.id + '.json',
    JSON.stringify(req.body, undefined, 2),
    function(err){
      if (err) {
        return next(err);
      }
      res.status(204).end();
    }
  );
});

app.get('/NexaAdfModel/:sessionId/:id', function(req, res, next){
  var storeDir = session_data + "/NexaSession-" + req.params.sessionId + "/NexaAdfModel/";
  if (!fs.existsSync(storeDir)){
    // console.log("creating dir " +storeDir);
    fs.mkdirSync(storeDir);
  }
  fs.readFile(storeDir + req.params.id + '.json', encoding, function(err, data){
    if (err) {
      return next(err);
    }
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(data);
  });
});


app.post('/NexaAdfModel/:sessionId/:id', function(req, res, next){
  var storeDir = session_data + "/NexaSession-" + req.params.sessionId + "/NexaAdfModel/";
  // console.log("store data",req.body.rows[0].columns[0].widgets[1].config);
  fs.writeFile(
    storeDir + req.params.id + '.json',
    JSON.stringify(req.body, undefined, 2),
    function(err){
      if (err) {
        return next(err);
      }
      res.status(204).end();
    }
  );
});

app.post('/NexaSessionModel/:sessionId', function(req, res, next){
	   //console.log(req.body)
  var adf_model = session_data + "/NexaSession-" + req.params.sessionId + "/NexaAdfModel/";
  var intra_model = session_data + "/NexaSession-" + req.params.sessionId + "/NexaIntraSessionSharedModel/";
  var models_changed = req.body.models_changed;
  var sessionData = req.body.data;
  var storeDir;
  models_changed.forEach(function(id,index) {
    if(id.indexOf("Dashboard") ===-1){
      storeDir=intra_model
    } else {
       storeDir = adf_model
    }
      fs.writeFile(
        storeDir + id + '.json',
        JSON.stringify(sessionData[id], undefined, 2),
        function(err){
          if (err) {
            console.log("Could not write file for id: " + "in session: "+ req.params.sessionId);
          }
        });
  });
  res.status(204).end();
});

app.delete('/NexaAdfModel/:sessionId/:id', function(req, res, next){
  var storeDir = session_data + "/NexaSession-" + req.params.sessionId + "/NexaAdfModel/";
  fs.unlink(storeDir + req.params.id + '.json', function(err){
    if (err) {
      return next(err);
    }
    res.status(204).end();
  });
});

app.get('/session_data/:sessionId', function(req, res, next){
    //  console.log("session data request");
    if(session_id_data_map.has(req.params.sessionId))
    {
      var session_data = session_id_data_map.get(req.params.sessionId);
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(session_data));
    }
});

app.post('/manager/create/:id', function(req, res, next){
 console.log("[NEXA Logic WorkBench] (I): Creating session model for session",req.body);
  var dir = session_data + "/NexaSession-"+ req.params.id;
  var storeDir = dir + '/NexaAdfModel/';
  var storeDir1 = dir + '/NexaIntraSessionSharedModel/';
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
    fs.mkdirSync(storeDir);
    fs.mkdirSync(storeDir1);
    session_id_data_map.set(req.params.id,req.body);
   }
  res.status(204).end();
});

app.post('/manager/pause/:id', function(req, res, next){
  console.log("[NEXA Logic WorkBench] (I): Session pause called ...", req.params)
    res.status(204).end();
});

app.post('/manager/resume/:id', function(req, res, next){
  console.log("[NEXA Logic WorkBench] (I): Session resume called", req.params)
    res.status(204).end();
});

app.post('/manager/clone/:id', function(req, res, next){
  console.log("[NEXA Logic WorkBench] (I): Session clone called ...", req.params)
    res.status(204).end();
});

app.post('/manager/snapshot/:id', function(req, res, next){
  console.log("[NEXA Logic WorkBench] (I): Session snapshot called ...", req.params)
    res.status(204).end();
});

app.post('/manager/delete/:id', function(req, res, next){
  //shashi: update workbench manager to not create/delete interface, session
  // entire model
  var dir = session_data + "/NexaSession-"+ req.params.id;
  fs.remove(dir, err => {
  if (err) return console.error(err)
   });
   res.status(204).end();
});

app.use(function(err, req, res, next) {
  if (err.errno === 34 || err.errno === -4058){
    console.log("[NEXA Logic WorkBench] (I): Could not find file for url %s", req.url);
    res.status(404).end();
  } else {
    console.log("[NEXA Logic WorkBench] (I): Unknown error on url %s: ", req.url, err);
    //res.status(500).end();
    res.sendFile('public/index.html', {root: __dirname});
  }
});
// Interface create,storage and retrieval logic/routes - End


module.exports = app;
var port = 9003

/* Start Listening on port */
/*if (config.useHttps) {
    var https = require('https');
    var sslKey         = fs.readFileSync(config.serverKeyPath,  'utf8');
    var sslCertificate = fs.readFileSync(config.serverCertPath, 'utf8');
    var sslCredentials = {key: sslKey, cert: sslCertificate};
    var httpsServer = https.createServer(sslCredentials, app).listen(port, host, function() {
    console.log("[NEXA Logic WorkBench] (I): Node server is up on " + port + "'");
    }
);
} else {*/
    var http  = require('http');
    var httpServer = http.createServer(app);
    httpServer.listen(port, function() {
    console.log("[NEXA Logic WorkBench] (I): Node server is up on " + port + "'");
    }
);
//}

