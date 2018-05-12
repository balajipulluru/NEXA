angular
  .module( "websocket", [] )
  .factory( "websocket", ( $location, $q, $rootScope, $timeout, $mdToast ) =>
{
  let g_reply_id = 0;

  function init( connect_obj, open_cb, disconnect_cb )
  {
    let ws = {
      connect:           connect_obj,
      url:               null,
      socket:            null,
      routes:            new Map(),
      reconnect_count:   0,
      reconnect_timeout: 0,
      reconnect_timer:   null,
      get:               ws_get,
      send:              ws_send,
      subscribe:         ws_subscribe,
      unsubscribe:       ws_unsubscribe,
      reconnect:         ws_reconnect,
      _connect:          _connect
    };

    function connect_ws()
    {
      ws.socket           = new WebSocket( ws.url );
      ws.socket.onopen    = () => { reconnect_hide.apply(ws); open_cb() }
      ws.socket.onclose   = disconnect_cb ? disconnect_cb : reconnect_cb.bind(ws);
      ws.socket.onmessage = on_message.bind(ws);
    }

    function _connect()
    {
      if( typeof ws.connect === "number" )
      {
        ws.url = "ws://" + $location.host() + ":" + ws.connect;
        connect_ws();
      }
      else if( typeof ws.connect === "string" )
      {
        ws.url = ws.connect;
        connect_ws();
      }
      else // function
      {
        ws.url = null;
        ws.connect( ( ws_url ) =>
        {
          ws.url = ws_url;
          connect_ws();
        } );
      }
    }
    _connect();

    return ws;
  }

  function ws_get( id, cb )
  {
    this.routes.set( id, cb );
  }

  function ws_send( id, obj = {} )
  {
    let reply_id = "__reply_" + g_reply_id++;

    this.socket.send( JSON.stringify( { id: id, reply_id: reply_id, data: obj } ) );

    let defer = $q.defer();
    this.routes.set( reply_id, ( reply_obj, ths, is_err ) =>
    {
      this.routes.delete( reply_id );
      if( ! is_err )
      {
        defer.resolve( reply_obj );
      }
      else
      {
        defer.reject( reply_obj );
      }
    } );

    return defer.promise;
  }

  function ws_subscribe( id, data, cb, changes_only = false )
  {
    let reply_id = "__subscribe_" + g_reply_id++;
    let o = { id: id, reply_id: reply_id, data: data };
    if( changes_only ) o.changes_only = true;

    this.socket.send( JSON.stringify( o ) );

    this.routes.set( reply_id, cb );
  }

  function ws_unsubscribe( id, data )
  {
    this.socket.send( JSON.stringify( { id: id, unsubscribe: true, data: data } ) );
  }

  function ws_reconnect( open_cb )
  {
    this._connect();
  }

  function on_message( event )
  {
    let msg = JSON.parse( event.data );
    let func = this.routes.get( msg.id )
    if( func )
    {
      $rootScope.$apply( () =>
      {
        func( msg.data, this, msg.error );
      } );
    }
    else
    {
      console.error( "websocket: unknown id=%s", msg.id );
    }
  }

  function reconnect_hide()
  {
    if( this.reconnect_count > 0 )
    {
      this.reconnect_count = 0;
      $mdToast.cancel();
    }
  }

  function reconnect_cb( ev )
  {
    let msg = () =>
    {
      let m = "Disconnected from server ";
      if( this.reconnect_timeout > 0 )
      {
        m += "(retry in " + this.reconnect_timeout + " sec)";
      }
      else
      {
        m += "(reconnecting...)";
      }
      return m;
    }

    if( ev.code == 1006 ) // CLOSE_ABNORMAL
    {
      // 4 sec min - about the time for node restart
      this.reconnect_timeout = Math.pow( 2, this.reconnect_count + 2 );

      if( this.reconnect_count == 0 )
      {
        let toast = $mdToast.simple()
              .textContent( msg() )
              .highlightAction( true )
              .position( "bottom left" )
              .action( "Reconnect" )
              .hideDelay( 0 );
        $mdToast.show( toast ).then( ( response ) =>
        {
          if( response == 'ok' ) this.reconnect();
          this.reconnect_count = 0;
          if( this.reconnect_timer )
          {
            $timeout.cancel( this.reconnect_timer );
            this.reconnect_timer = null;
          }
        } );
      }

      let update = () =>
      {
        this.reconnect_timeout--;
        if( this.reconnect_timeout == 0 )
        {
          this.reconnect();
        }
        else
        {
          this.reconnect_timer = $timeout( update, 1000 );
        }
        $mdToast.updateTextContent( msg() );
      }
      this.reconnect_timer = $timeout( update, 1000 );

      this.reconnect_count++;
      if( this.reconnect_count > 4 ) this.reconnect_count = 4; // 64 sec max
    }
  }

  return init;
});
