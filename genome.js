//The Genome Class
//Well.. this is the main class
//This is where all the magic appends
class Genome {
	constructor(inp, out, id, offSpring = false) {
		this.inputs = inp; //Number of inputs
		this.outputs = out; //Number of outputs
		this.id = id; //Genome id -> used for the drawing
		this.layers = 2;
		this.nextNode = 0;

		this.nodes = [];
		this.connections = [];

		if(!offSpring) { //This is not an offspring genome generate a fullyConnected net
			for (let i = 0; i < this.inputs; i++) {
				this.nodes.push(new Node(this.nextNode, 0));
				this.nextNode++;
			}

			for (let i = 0; i < this.outputs; i++) {
				let node = new Node(this.nextNode, 1);
				node.output = true;
				this.nodes.push(node);
				this.nextNode++;
			}


			for (let i = 0; i < this.inputs; i++) {
				for (let j = this.inputs; j < this.outputs + this.inputs; j++) {
					let weight = Math.random() * this.inputs * Math.sqrt(2 / this.inputs);
					this.connections.push(new Connection(this.nodes[i], this.nodes[j], weight));
				}
			}
		}
	}

	//Network Core
	generateNetwork() {
		//Clear all outputConnections in the nodes
		this.nodes.forEach((node) => {
			node.outputConnections.splice(0, node.outputConnections.length);
		});

		//Add the connections to the Nodes
		this.connections.forEach((conn) => {
			conn.fromNode.outputConnections.push(conn);
		});

		//Prepare for feed forward
		this.sortByLayer();
	}

	feedForward(inputValues) {
		this.generateNetwork(); //Connect all up

		//Clear old inputs
		this.nodes.forEach((node) => { node.inputSum = 0; });

		//asin new inputs
		for (let i = 0; i < this.inputs; i++)
			this.nodes[i].outputValue = inputValues[i];

		//Engage all nodes and Extract the results from the outputs
		let result = [];
		this.nodes.forEach((node) => {
			node.engage();

			if (node.output)
				result.push(node.outputValue);
		});
		return result;
	}


	//Crossover
	crossover(partner) {
		//TODO: find a good way to generate unique ids
		let offSpring = new Genome(this.inputs, this.outputs, 0, true); //Child genome
		offSpring.nextNode = this.nextNode; 

		//Randomly take nodes from this or the partner network
		for(let i = 0; i < offSpring.nextNode; i++){
			let rand = Math.random();
			let node; 
			if(rand > 0.5){
				let index = this.getNode(i);
				node = this.nodes[index].clone();
			} else {
				let index = partner.getNode(i);
				if(index != -1)
					node = partner.nodes[index].clone();
				else
					node = this.nodes[this.getNode(i)].clone();	
			}
			node.layer = 0;
			offSpring.nodes.push(node);
		}
		
		//Randomly take connections from this or the partner network
		let maxLayer = 0;
		for(let i = 0; i < this.connections.length; i++) {
			let index = this.commonConnection(this.connections[i].getInnovationNumber(), partner.connections);
			
			if(index != -1) { //There is a commonConnection
				let conn = Math.random() > 0.5 ? this.connections[i].clone() : partner.connections[index].clone();
				
				//Reassign nodes
				let fromNode = offSpring.nodes[offSpring.getNode(conn.fromNode.number)];
				let toNode = offSpring.nodes[offSpring.getNode(conn.toNode.number)];
				
				//Calculate new layers for each node
				if(fromNode.layer >= toNode.layer) 
					toNode.layer++;
				
				if(toNode.layer > maxLayer)
					maxLayer = toNode.layer;
				
				conn.fromNode = fromNode;
				conn.toNode = toNode;

				//Add this connection to the child
				if(fromNode && toNode)
					offSpring.connections.push(conn);
			}
			else  { //No common connection -> take from this
				let conn = this.connections[i].clone();
				
				//Reassign nodes
				let fromNode = offSpring.nodes[offSpring.getNode(conn.fromNode.number)];
				let toNode = offSpring.nodes[offSpring.getNode(conn.toNode.number)];
				
				//Calculate new layers for each node
				if(fromNode.layer >= toNode.layer) 
					toNode.layer++;			

				if(toNode.layer > maxLayer)
					maxLayer = toNode.layer;

				conn.fromNode = fromNode;
				conn.toNode = toNode;

				//Add this connection to the child
				if(fromNode && toNode)
					offSpring.connections.push(conn);
			}
		}

		offSpring.layers = maxLayer + 1; //Number of layers
		return offSpring;
	}
	


	//Mutation Stuff
	mutate() {
		//console.log("Mutation...");
		let mut;

		if(Math.random() < 0.8) { //80%
			//MOD Connections
			mut = "ModConn";
			let i = Math.floor(Math.random() * this.connections.length);
			this.connections[i].mutateWeight();
		}

		if(Math.random() < 0.5) { //50%
			//MOD Bias
			mut = "ModBias";
			let i = Math.floor(Math.random() * this.nodes.length);
			this.nodes[i].mutateBias();
		}

		if(Math.random() < 0.1) { //10%
			//MOD Node
			mut = "ModAct";
			let i = Math.floor(Math.random() * this.nodes.length);
			this.nodes[i].mutateActivation();
		}

		if(Math.random() < 0.05) { //5%
			//ADD Connections
			mut = "AddConn";
			this.addConnection();
		}

		if(Math.random() < 0.01) { //1%
			//ADD Node
			mut = "AddNode";
			this.addNode();
		}
	}

	addNode() { //Add a node to the network
		//Get a random connection to replace with a node
		let connectionIndex = Math.floor(Math.random() * this.connections.length);
		let pickedConnection = this.connections[connectionIndex];
		pickedConnection.enabled = false;
		this.connections.splice(connectionIndex, 1); //Delete the connection

		//Create the new node
		let newNode = new Node(this.nextNode, pickedConnection.fromNode.layer + 1);
		this.nodes.forEach((node) => { //Shift all nodes layer value
			if (node.layer > pickedConnection.fromNode.layer)
				node.layer++;
		});

		//New connections
		let newConnection1 = new Connection(pickedConnection.fromNode, newNode, Math.random() * this.inputs * Math.sqrt(2 / this.inputs));
		let newConnection2 = new Connection(newNode, pickedConnection.toNode, Math.random() * this.inputs * Math.sqrt(2 / this.inputs));

		this.layers++;
		this.connections.push(newConnection1); //Add connection
		this.connections.push(newConnection2); //Add connection
		this.nodes.push(newNode); //Add node
		this.nextNode++;
	}

	addConnection() { //Add a connection to the network
		if (this.fullyConnected())
			return; //Cannot add connections if it's fullyConnected

		//Choose to nodes to connect
		let node1 = Math.floor(Math.random() * this.nodes.length);
		let node2 = Math.floor(Math.random() * this.nodes.length);

		//Search for two valid nodes
		while (this.nodes[node1].layer == this.nodes[node2].layer
			|| this.nodesConnected(this.nodes[node1], this.nodes[node2])) {
			node1 = Math.floor(Math.random() * this.nodes.length);
			node2 = Math.floor(Math.random() * this.nodes.length);
		}

		//Switch nodes based on their layer
		if (this.nodes[node1].layer > this.nodes[node2].layer) {
			let temp = node1;
			node1 = node2;
			node2 = temp;
		}

		//add the connection
		let newConnection = new Connection(this.nodes[node1], this.nodes[node2], Math.random() * this.inputs * Math.sqrt(2 / this.inputs));
		this.connections.push(newConnection);
	}



	//Utilities
	commonConnection(innN, connections) {
		//Search through all connections to check for
		//one with the correct Innovation Number
		for(let i = 0; i < connections.length; i++){
			if(innN == connections[i].getInnovationNumber())
				return i;
		}

		//Found nothing
		return -1;
	}

	nodesConnected(node1, node2) {
		//Search if there is a connection between node1 & node2
		for (let i = 0; i < this.connections.length; i++) {
			let conn = this.connections[i];
			if ((conn.fromNode == node1 && conn.toNode == node2)
				|| (conn.fromNode == node2 && conn.toNode == node1)) {
				return true;
			}
		};

		return false;
	}

	fullyConnected() {
		//check if the network is fully connected
		let maxConnections = 0;
		let nodesPerLayer = [];

		//Calculate all possible connections
		this.nodes.forEach((node) => {
			if (nodesPerLayer[node.layer] != undefined)
				nodesPerLayer[node.layer]++;
			else
				nodesPerLayer[node.layer] = 1;
		});

		for (let i = 0; i < this.layers - 1; i++)
			for (let j = i + 1; j < this.layers; j++)
				maxConnections += nodesPerLayer[i] * nodesPerLayer[j];

		//Compare
		return maxConnections == this.connections.length;
	}

	sortByLayer(){
		//Sort all nodes by layer
		this.nodes.sort((a, b) => {
			return a.layer - b.layer;
		});
	}

	clone() { //Returns a copy of this genome
		let clone = new Genome(this.inputs, this.outputs, this.id);
		clone.nodes = this.nodes.slice(0, this.nodes.length);
		clone.connections = this.connections.slice(0, this.connections.length);

		return clone;
	}

	getNode(x){ //Returns the index of a node with that Number
		for(let i = 0; i < this.nodes.length; i++)
			if(this.nodes[i].number == x)
				return i;

		return -1;
	}

	calculateWeight() { //Computational weight of the network
		return this.connections.length + this.nodes.length;
	}

	draw() { //Draw the genome to a svg
		var element = document.getElementById(this.id);
		if (element)
			element.parentNode.removeChild(element);

		var width = 400,
			height = 400

		var svg = d3.select("body").append("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("id", this.id);


		var force = d3.layout.force()
			.gravity(.05)
			.distance(100)
			.charge(-100)
			.size([width, height]);


		var connections = [];
		for (let i = 0; i < this.connections.length; i++) {
			connections.push({ source: this.connections[i].fromNode.number, target: this.connections[i].toNode.number, weight: this.connections[i].weight, enabled: this.connections[i].enabled });
		}

		force.nodes(this.nodes)
			.links(connections)
			.start();

		var link = svg.selectAll(".link")
			.data(connections)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-width", function (d) { return d.enabled ? 0.25 + d.weight * 2 : 0 })
			.style("stroke", function (d) { return d.weight > 0 ? "#0f0" : "#f00"; });

		var node = svg.selectAll(".node")
			.data(this.nodes)
			.enter().append("g")
			.attr("class", "node")
			.call(force.drag);

		node.append("circle")
			.attr("r", "5")
			.attr("fill", function (d) { return d.layer == 0 ? "#00f" : d.output ? "#f00" : "#000" });
		
		node.append("text")
			.attr("dx", 12)
			.attr("dy", ".35em")
			.text(function(d) { return d.number });

		force.on("tick", function () {
			link.attr("x1", function (d) { return d.source.x; })
				.attr("y1", function (d) { return d.source.y; })
				.attr("x2", function (d) { return d.target.x; })
				.attr("y2", function (d) { return d.target.y; });

			node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
		});
	}
}