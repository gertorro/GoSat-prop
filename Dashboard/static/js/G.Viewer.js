//G.Viewer REV: 502
G.Viewer = function(options) {
	console.log("G.Viewer REV = " + G.REV);
	var self = this.self = this;
	this.ratate = false;
	this.wireframe = false;
	this.orgX = 0;
	this.orgY = 0;
	this.lastTime = 0;
	this.lastFrames = 0;
	this.currentFrames = 0;
	this.fps = 0;
	this.filename = "";
	this.meshes = [];
	this.colors = [];
	this.models = [];
	this.init(options);
};

G.Viewer.prototype.init = function(options){
	this.options = options || {};
	this.width = options.width || 360; 
	this.height = options.height || 360;
	this.dropable = options.dropable || false;
	this.backgroundColor = options.backgroundColor || 0x121b22;
	this.defaultMaterialColor = options.materialColor || 0xBBBBBB;
			
	this.scene = new THREE.Scene();
	
	this.initCanvas();
	this.initCamera();
	this.initLighting();
	this.initRenderer();
	this.initColors();

	this.material = new THREE.MeshLambertMaterial({color: this.materialColor, wireframe: this.wireframe});
	
	this.bindEvent();
	
	this.setStatus({status:'idel'});
		
	if(this.options.url) {
		this.loadResource(this.options.url);
	}
}

G.Viewer.prototype.initCanvas = function() {
	var id = Math.floor((Math.random()*10000000)+1);
	this.container = this.options.container ? $("#"+this.options.container) : null;
	if(!this.container){
		document.write('<div id="container_' + id + '"></div>');
		this.container = $("#container_" + id);
	};
	
	this.container.attr("tabindex", id).css({position:"relative", width:this.width, height:this.height, margin:"8px 0"});
	this.$canvas3d = $("<canvas></canvas>").css({width:this.width, height:this.height, position:"absolute", right:0, top:0}).appendTo(this.container);
	this.$canvas2d = $("<canvas></canvas>").css({width:this.width, height:this.height, "background-color": "transparent", "z-index":9, position:"absolute", right:0, top:0}).appendTo(this.container);	
};

G.Viewer.prototype.initLighting = function() {
	this.light1 = new THREE.PointLight( 0xFFFFFF );
	this.light1.position.set(-10, 10, 50);

	this.light2 = new THREE.PointLight( 0xFFFFFF );
	this.light2.position.set(10, 10, -50);
	
	this.scene.add(this.light1);
	this.scene.add(this.light2);
}

G.Viewer.prototype.initRenderer = function() {
	if ("WebGLRenderingContext" in window)
		this.renderer = new THREE.WebGLRenderer({canvas: this.$canvas3d.get(0), antialias: true});
	else
		this.renderer = new THREE.CanvasRenderer({canvas: this.$canvas3d.get(0)});
		
	this.renderer2D = new THREE.CanvasRenderer({canvas: this.$canvas2d.get(0)});
	
	this.renderer.setClearColor(0x000000, 0);
	this.renderer.setSize( this.width, this.height );
	
	this.renderer2D.setSize( this.width, this.height );
};

G.Viewer.prototype.drawInfo = function(ctx2d){
	var x = this.width / 2;
	var y = this.height / 2;
	ctx2d.font = '9pt Calibri';
	ctx2d.fillStyle = '#FFFFFF';
	ctx2d.textAlign = 'center';
	var text = "";
	var vertices = 0;
	var faces = 0;
	var polygons = 0;
	var holes = 0;
	var self = this;
	$.each(this.models, function(index, model){
		if(model instanceof G.Model)
		{
			vertices += model.vs.length;
			faces +=  model.fs.length;
		}
		else if(model instanceof G.Polygon)
		{
			polygons ++;
			holes += model.ins.length;
			vertices += model.out.vs.length;
			$.each(model.ins, function(index, pc){
				vertices += pc.vs.length;
			});
		}
	});
	/*
	if(vertices>0)
		text += " V:"  + vertices ;
	if(faces>0)
		text += " F:" + faces;
	if(polygons>0)
		text += " P:" + polygons;
	if(holes>0)
		text += " H:" + holes;
	
	if(this.wireframe) text += " wireframe";
	
	ctx2d.fillText(text, x, 15);
	*/
	//ctx2d.fillText(this.filename, x, this.height - 8);
	
	// in animation status
	if(this.animation)
	{
		var now = new Date();
		var mms = now - this.lastTime;
		if(mms > 500)
		{
			this.fps = Math.round(1000.0*(this.currentFrames - this.lastFrames)/mms);
			this.lastFrames = this.currentFrames;
			this.lastTime = now;
		}
		ctx2d.textAlign = 'left';
		ctx2d.fillText('fps:' + this.fps + '/60', 5, 15);
	}
};

G.Viewer.prototype.render = function() {
	var ctx2d = this.renderer2D.domElement.getContext('2d');
	ctx2d.clearRect (0, 0, this.width, this.height);
	var x = this.width / 2;
	var y = this.height / 2;
	
	if(this.status == "idel") {	
		if(this.dropable){
			ctx2d.font = '24pt Calibri';
			ctx2d.textAlign = 'center';
			ctx2d.fillStyle = '#FFFFFF';
			ctx2d.fillText('Drop File Here', x, y-10);
			ctx2d.font = '12pt Calibri';
			ctx2d.fillText('Supported format: ' + G.Formats.join(','), x, y+20);
		}
	}
	else if(this.status == 'parsing' || this.status == 'loading'){
		ctx2d.beginPath();
		ctx2d.rect(0, 0, this.progress*this.width/100.0, 4);
		ctx2d.fillStyle = ((this.status == 'loading') ? '#CD332D' : '#76B900');
		ctx2d.fill();
	}
	else if(this.status == "loaded") {
		this.drawInfo(ctx2d);
	}

	this.renderer.render( this.scene, this.camera );	
};

G.Viewer.prototype.animate = function() {
	if(!this.animation) {
		this.currentFrames = this.lastFrames = 0;
		this.lastTime = 0;
		return;
	}
	if(this.rotating){
		this.rotateMeshes(0, 0.01);
	};
	this.render();
	this.currentFrames++;
	requestAnimationFrame(this.animate.bind(this));
};


G.Viewer.prototype.bindEvent = function() {
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.
		this.container.get(0).addEventListener("dragenter", this.dragEnterHandler.bind(this), false);  
		this.container.get(0).addEventListener("dragover", this.dragOverHandler.bind(this), false);  
		this.container.get(0).addEventListener("drop", this.dropHandler.bind(this), false); 
	
	} else {
	  alert("The File API is needed for this application! Your browser is not supported!");
	}
	this.container.get(0).addEventListener('mousedown', this.mouseDownHandler.bind(this), false);
	this.container.get(0).addEventListener('mouseup', this.mouseUpHandler.bind(this), false);
	this.container.get(0).addEventListener('mousemove', this.mouseMoveHandler.bind(this), false);
	this.container.get(0).addEventListener('DOMMouseScroll', this.mouseWheelHandler.bind(this), false);
	this.container.get(0).addEventListener('mousewheel', this.mouseWheelHandler.bind(this), false);
	$(this.container).keydown(this.keyDownHandler.bind(this));
	$(this.container).mouseout(this.mouseoutHandler.bind(this));
};

G.Viewer.prototype.setStatus = function(status){
	this.status = status.status;
	this.progress = status.progress;
	this.render();
};

G.Viewer.prototype.loadedHandler = function(models){
	this.setStatus({status:'loaded'});
	this.addModels(models);
	this.resetCamera();	
	this.render();
};

G.Viewer.prototype.loadResource = function(url){
	var self = this;
	var start = new Date();
	$.ajax({
		url: url,
		xhrFields: {
			onprogress: function(e) {
			if (e.lengthComputable) {
				var p = Number((e.loaded / e.total * 100));
				self.setStatus({status:"loading", progress: p});
			}
		}
	}
	}).done(function(data){
		var end = new Date();
		console.log("G.Viewer [" + url + "] loaded in " + (end - start) + "ms");
		self.setStatus({status:"loading", progress: 100});
		setTimeout(function(){
			self.loadModel(url, data);	
			data = null;
			self = null;	
		}, 20);
	});
}

/*
 * -------------------------------------------------------
 * Model Utilities
 * -------------------------------------------------------
 */
G.Viewer.prototype.removeAllModels = function(){
	$.each(this.models, function(index, model){
		model.dispose();
	});
	
	this.models = [];
};

G.Viewer.prototype.addModels = function(models){
	for(var i=0;i<models.length;i++)
		this.addModel(models[i]);
};

G.Viewer.prototype.addModel = function(model){
	this.models.push(model);
	var start = new Date();
	var geometry = model.toTHREEGeometry();
	var model_color = this.colors[(this.models.length - 1) % this.colors.length];
	
	var material = new THREE.MeshLambertMaterial({
			color : new THREE.Color(model_color),
		 	wireframe : this.wireframe
		});
		
	var mesh = new THREE.Mesh( geometry, material );
	console.log("G.Viewer geometry/mesh built in " + (new Date() - start) + "ms");
	this.addMesh(mesh);
	return this;
};

/* 
 * -------------------------------------------------------
 * Mesh Utilities
 * -------------------------------------------------------
 */
G.Viewer.prototype.addMesh = function(mesh){
	this.meshes.push(mesh);
	this.scene.add(mesh);
	this.render();
	return this;
};

// remove all the meshes on the scene
G.Viewer.prototype.removeAllMeshes = function(){
	var self = this;
	$.each(this.meshes, function(index, mesh){
		self.scene.remove(mesh);
		mesh.geometry.dispose();
		mesh.material.dispose();
	});
	
	this.meshes = [];
	this.render();
	return this;
};

// reset meshes' position and rotation vector
G.Viewer.prototype.resetMeshes = function(){
	$.each(this.meshes, function(index, mesh){
		mesh.position.set(0,0,0);
		mesh.rotation.set(0,0,0);
	});
	return this;
};

// move all the meshes
G.Viewer.prototype.moveMeshes = function(dx, dy){
	$.each(this.meshes, function(index, mesh){
		mesh.position.x += dx;
		mesh.position.y += dy;
	});
	return this;
};

G.Viewer.prototype.rotateMeshes = function(dx, dy){
	$.each(this.meshes, function(index, mesh){
		mesh.rotation.x += dx;
		mesh.rotation.y += dy;
	});
	return this;
};

G.Viewer.prototype.toggleWireframe = function(){
	if(this.meshes.length==0) return;
	this.wireframe = !this.wireframe;
	var self = this;
	$.each(this.meshes, function(index, mesh){
		mesh.material.wireframe = self.wireframe;
	});
	return this;
};

/* 
 * -------------------------------------------------------
 * Camera Utilities
 * -------------------------------------------------------
 */
G.Viewer.prototype.initCamera = function() {
	this.camera = new THREE.PerspectiveCamera(45, this.width/this.height,0.1,10000);
	if(this.scene)
		this.scene.add(this.camera);
	this.resetCamera();
	return this;
}

G.Viewer.prototype.resetCamera = function() {
	if(this.camera)
		this.camera.position.z = 1;
	return this;
}

G.Viewer.prototype.zoomCamera = function(factor){
	if(this.camera)
		this.camera.position.z *= factor;
	return this;
};

/*
 * -------------------------------------------------------
 * Color Utilities
 * -------------------------------------------------------
 */
G.Viewer.prototype.initColors = function() {
	this.colors = new Array(16);
	this.randomColors();
	if(this.defaultMaterialColor) 
		this.colors[0] = this.defaultMaterialColor;
};

G.Viewer.prototype.randomColors = function() {
	while(this.colors.length < this.meshes.length)
		this.colors.push(0);
	for(var i=0;i<this.colors.length;i++)
		this.colors[i] = Math.floor(Math.random()*16777215);
	for(var i=0;i<this.meshes.length;i++)
		this.meshes[i].material.color.setHex(this.colors[i%this.colors.length]);
};

/* -------------------------------------------------------
 * Event Handlers
 * -------------------------------------------------------
 */ 
G.Viewer.prototype.keyDownHandler = function(e) {
	e.stopPropagation();
	var key = e.keyCode || e.which;
	switch(key){
		case 38:	// up
			this.moveMeshes(0, 0.02);
			break;
		case 40:	//down
			this.moveMeshes(0, -0.02);
			break;
		case 37:	//left
			this.moveMeshes(-0.02, 0);
			break;
		case 39:	//right
			this.moveMeshes(0.02, 0);
			break;
		case 219:	// '[' zoom out
			this.zoomCamera(10.0/9);
			break;
		case 221:	// ']' zoom in
			this.zoomCamera(0.9);
			break;
		case 67:	// c random colors
			this.randomColors();
			break;
		case 87:	//w toggle wireframe
			this.toggleWireframe();
			break;
		case 82:	//r reset camera & meshes
			this.resetCamera();
			this.resetMeshes();
			break;
		case 32:	// space, rotating the model around z axis
			this.animation = this.rotating = !this.rotating;
			if(this.rotating)
				this.animate();
			break;
	}
	
	this.render();
	return false;
};

G.Viewer.prototype.mouseDownHandler = function(e) {
	if(this.meshes.length==0) return;
	e.stopPropagation();
	if(e.button==0)
		this.rotate=true;
	this.orgX=e.clientX;
	this.orgY=e.clientY;
	return false;
};

G.Viewer.prototype.mouseMoveHandler = function(e) {
	e.stopPropagation();
	if(!this.rotate) return;
	if(this.rotate)
	{
		this.rotateMeshes((e.clientY-this.orgY)/this.width*4, (e.clientX-this.orgX)/this.width*4);
		this.rotating = this.animation = false;
	}
	this.orgX=e.clientX;
	this.orgY=e.clientY;
	this.render();
	return false;
};
	
G.Viewer.prototype.mouseUpHandler = function(e) {
	e.stopPropagation()
	this.rotate = false;
	return false;
};

G.Viewer.prototype.mouseoutHandler = function(e) {
	e.stopPropagation()
	this.rotate = false;
	return false;
};
	
G.Viewer.prototype.mouseWheelHandler = function(e) {
	e.stopPropagation();
	e.preventDefault();
	if(e.wheelDelta)
	{
		this.zoomCamera(e.wheelDelta > 0 ? 1.11 : 0.9);
	}
	else
	{
		this.zoomCamera(e.detail < 0 ? 1.11 : 0.9);
	}
	this.render();
	return false;
};

G.Viewer.prototype.dropHandler = function(e) {
	e.stopPropagation();
	e.preventDefault();
	
	if(!this.dropable) return false;
	
	if(this.status == 'loading' || this.status == "parsing")
	{
		alert('Please wait while loading...');
		return;
	}

	var dt = e.dataTransfer;
	var files = dt.files;
	
	if(files)
		this.handleFiles(files);
};

G.Viewer.prototype.dragEnterHandler = function(e) {
	e.stopPropagation();
	e.preventDefault();
};

G.Viewer.prototype.dragOverHandler = function(e) {
	e.stopPropagation();
	e.preventDefault();
}

G.Viewer.prototype.loadModel = function(url, str, callback){
	this.setStatus({status:"parsing", progress: 0});

	this.filename = url.substring(url.lastIndexOf('/')+1);	
	
	var ext =  this.filename.split('.').pop().toLowerCase();
	
	var parser = G.ParserFactory.getParser(ext);
	
	parser.parse(str 
		, this.loadedHandler.bind(this)	// onLoad 
		, this.setStatus.bind(this) 	// onProgress
	);	
};

G.Viewer.prototype.handleFiles = function(files) {
	var reader = new FileReader();
	var self = this;
	var start = new Date();
	reader.onload=function(e){
		var end = new Date();
		console.log("G.Viewer [" + files[0].name + "] read in " + (end - start) + "ms");
		var str=e.target.result;
		self.loadModel(files[0].name, str);
	};
	reader.onprogress=function(evt){
		if (evt.lengthComputable) {
			var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
			self.setStatus({status:'loading', progress: percentLoaded});
		}
	};
	var ext = files[0].name.toLowerCase().split('.').pop();
	if(G.Formats.indexOf(ext) < 0)
	{
		alert("Unknown file format.\nSupported file format: " + supported.join(","));
	}
	else
	{
		// do the cleaning work before read the file
		this.filename = "loading..." + files[0].name;
		this.removeAllModels();
		this.removeAllMeshes();
		// read the file
		reader.readAsBinaryString(files[0]);
	}
};
