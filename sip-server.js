var SIPClient = require('./sip-client.js');

module.exports = function(RED) {
    function SIPServerNode(n) {
        RED.nodes.createNode(this,n);
		var node = this;
		
        node.host = n.host;
        node.port = n.port;
		node.state = null;
		node.debug = n.debug;
		node.message = null;
		
		this.connect = function(){
			
			if(!node.sipclient || !node.sipclient.socket.connected){
				var opts = {
					user: node.credentials.username,
					password: node.credentials.password,
					host: node.host,
					debug: node.debug
				};
				node.sipclient = new SIPClient(opts);
				
				node.sipclient.on('cancel', function(msg){
					updateStatus("call_terminated");
				});
				
				node.sipclient.on('connected', function(msg){
					node.sipclient.on('invite', function(msg){
						var from = node.sipclient.sip.parseUri(msg.headers.from.uri);
						
						updateStatus("incoming");
						node.emit("incoming", from);
					});
					
					node.sipclient.on('call_terminated', function(msg){
						updateStatus("call_terminated");
					});
					node.sipclient.on('connection_closed', function(msg){
						updateStatus("closed");
					});
				});
				
				updateStatus("init");
				setTimeout(function() {
					login();
				}, 3000);
			}
		}
		
		function login(){
			var localPort = node.sipclient.socket.localPort;
			var localAddress = node.sipclient.socket.localAddress;
				
			var uri = {
				schema: 'sip',
				host: node.host,
				user: node.credentials.username,
			};
			var headers = {
				contact: "<sip:"+node.credentials.username+"@"+localAddress+":"+localPort+";transport=tcp>",
				from: {
					uri: uri
				},
				to: {
					uri: uri
				},
				via: [
					{
					  version: '2.0',
					  protocol: 'tcp',
					  host: localAddress,
					}
				  ]
			};
			
			updateStatus("registering");
			
			node.message = node.sipclient.message('register', {host: node.host}, headers);

			node.message.send();
			node.message.on('success', function(msg) {
				
				updateStatus("registered");
			
				//if (!node.check) { node.check = setInterval(KeepAlive, 30000); } //sending Keep Alives
				
				if (!node.relogin) { node.relogin = setInterval(login, 120000); } //sending Keep Alives
			});
		}
		
		function KeepAlive(){
			node.sipclient.send("\r\n\r\n");
		}

		function updateStatus(status) {
			node.state = status;
			switch(status) {
				case "init":
					node.emit("statusupdate", {fill:"grey",shape:"dot",text:"Init"});
					break;
				case "registering":
					node.emit("statusupdate", {fill:"yello",shape:"ring",text:"Trying to register on Server..."});
					break;
				case "registered":
				case "call_terminated":
					node.emit("statusupdate", {fill:"green",shape:"ring",text:"Registered on Server..."});
					break;
				case "incoming":
					node.emit("statusupdate", {fill:"green",shape:"dot",text:"Incoming..."});
					break;
				case "closed":
					node.emit("statusupdate", {fill:"red",shape:"ring",text:"Connection lost"});
					break;
				case "error":
					node.emit("statusupdate", {fill:"red",shape:"ring",text:"Error"});
					break;
			}
		};
		
		this.on('close', function(done) {
			if (node.sipclient) { node.sipclient.socket.close(); }
            if (this.check) { clearInterval(this.check); }
			if (this.relogin) { clearInterval(this.relogin); }
        });
		
		
		
		
						
		
		
		
	}
	RED.nodes.registerType("sip-server",SIPServerNode,{
		credentials: {
			username: {type:"text"},
			password: {type:"password"}
		}
	});
}