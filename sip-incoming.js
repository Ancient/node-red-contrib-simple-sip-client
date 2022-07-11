module.exports = function(RED) {
	
    function SIPIncomingNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
		node.config = RED.nodes.getNode(n.server);
        
		if(node.config){
			node.config.on('statusupdate', function(data){ node.status(data);});
			node.config.connect();
		
		
			node.config.on('incoming', function(data){
				var msg = {payload: data};
				node.send(msg);
			});
		/*node.on('close', function() {
            node.config.removeListener('statusUpdate', node.status);
        });*/
		}
    }
    RED.nodes.registerType("sip-incoming",SIPIncomingNode);
}