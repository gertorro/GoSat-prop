/*
 * Define G object
 * @author: Zhonghua Xi
 * @created: 7/26/2013
 */
var G = G || {REV : 502, BLD: 'Sat Aug 10 19:01:53 EDT 2013'};

// supported formats
G.Formats = ['obj','off','poly','json'];

G.LINES_TO_READ = 10000;
// global extensions

Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

/* JSONParser.js
 * @author Zhonghua Xi http://xiaohuahua.org/blog
 */

G.JSONParser = function(){
};

G.JSONParser.prototype = {
	progress: function(p){
		if(this.onProgress)
		{
			var self = this;
			self.onProgress({status: "parsing", progress: p});
		}
	},
    parse: function(str, onLoad, onProgress){
    	this.onProgress = onProgress;
    	var start = new Date();
        var data = $.parseJSON(str);
        console.log("G.JSONParser json parsed in " + (new Date() - start) + "ms");
	  	
        var build_start = new Date();
        var models = [];
        var self = this;
        var callbacked = false;
        var totalLines = 0;
        var processedLines = 0;
        
        $.each(data, function(index, json){
        	if(json.type == "model") {
        		totalLines += json.vertices ? json.vertices.length : 0;
        		totalLines += json.faces ? json.faces.length : 0;
        	}
        });
                
        $.each(data, function(index, json){
			if(json.type == "model") {
				var model = new G.Model();
				var vid = 0;
				var i = 0;
				
				var readVertex = function(){
					for(var l=0;l<G.LINES_TO_READ && i<json.vertices.length;i+=3,l++)
					{
						var v = new G.Vector3(json.vertices[i], json.vertices[i+1], json.vertices[i+2]);
						var vertex = new G.Vertex3(vid++, v);
						model.vs.push(vertex);
						processedLines += 3;
					}
					
					self.progress(processedLines*100.0/totalLines);
					
					if(i<json.vertices.length){
						setTimeout(readVertex, 0);
					}
					else{
						i = 0;
						readFaces();
					}
				};
				
				var readFaces = function(){
					for(var l=0;l<G.LINES_TO_READ && i<json.faces.length;i+=3,l++)
					{
						model.fs.push(
							new G.Face3(
								model.vs[json.faces[i]], 
								model.vs[json.faces[i+1]], 
								model.vs[json.faces[i+2]]
								)
							);
						processedLines += 3;
					}
					
					self.progress(processedLines*100.0/totalLines);
					
					if(i<json.faces.length){
						setTimeout(readFaces, 0);
					}
					else{
						i = 0;
						done();
					}
				};
				
				var done = function() {
					self.progress(100);
        
					var center_start = new Date();

					model.com = model.computeCom();
					model.R = model.computeR(model.com);
					model.centerAndScale(model.com, model.R);

					console.log("G.JSONParser vertices: " + model.vs.length + " faces: " + model.fs.length + " com: " + model.com + " R: " + model.R);		
					console.log("G.JSONParser model built in " + (new Date() - build_start) + "ms" + " centered in " + (new Date() - center_start) + "ms" + " Total = " + (new Date() - start) + "ms");
			
					if(onLoad) setTimeout(function(){
							onLoad([model]);
							callbacked = true;
							model = null;
					}, 0);
				}
				
				readVertex();
			} else if(json.type == "polygon"){
				var polygon = new G.Polygon();
				
				for(var p=0;p<json.polychains.length;p++)
				{
					var pc = json.polychains[p];
					var type = pc.type;
					var polychain = new G.Polychain();
					polychain.setType(type);
					polychain.vs = new Array(pc.points.length/2);
					for(var i=0;i<pc.points.length;i+=2){
						polychain.vs[i/2] = new G.Vector2(pc.points[i], pc.points[i+1]);
					}
		
					if(polychain.type == "out")
						polygon.out = polychain;
					else
						polygon.ins.push(polychain);
				}
				
				models.push(polygon);
			} 
        });
        
        if(!callbacked) {
        	var com = G.ModelHelper.computeCOM(models);
        	var R = G.ModelHelper.computeR(models, com);
        	G.ModelHelper.normalize(models, com, R);
        	
        	onLoad(models);
        }
    }
};

G.ObjParser = function(){
}

G.ObjParser.prototype.parse = function(objStr, onLoad, onProgress){
    if(onProgress) onProgress({status: "parsing", progress: 0});
    var start = new Date();
    var lines = objStr.split(/[\r\n]/g);
    var vid = 0;
    var lp = 0;
    var l = 0;
    var model = new G.Model();
    
    if(onProgress) onProgress({status: "parsing", progress: 10});
    
    var readfile = function() {
        for(i=0;i<G.LINES_TO_READ && l<lines.length;i++,l++)
        {
            var ls=lines[l].trim().split(/\s+/);
            if(ls[0] == "v")
            {
                var v = new G.Vector3(parseFloat(ls[1]),parseFloat(ls[2]),parseFloat(ls[3]));
                var vertex = new G.Vertex3(vid++, v);
                model.vs.push(vertex);
            }
            if(ls[0] == "f")
            {
                var vid1 = parseInt(ls[1])-1;
                var vid2 = parseInt(ls[2])-1;
                var vid3 = parseInt(ls[3])-1;
                var f = new G.Face3(model.vs[vid1], model.vs[vid2], model.vs[vid3]);
                model.fs.push(f);
            }
            ls = null;
        }
        
        var p = (l)*100.0/lines.length * 0.9 + 10;
        
        if(onProgress) 
        	 onProgress({status: "parsing", progress: p});
        
        if(l<lines.length){
            setTimeout(readfile, 0);
        }
        else
        {
            var loadTime = (new Date() - start);
            var center_start = new Date();

            model.com = model.computeCom();
            model.R = model.computeR(model.com);
            model.centerAndScale(model.com, model.R);
            
            var comTime = (new Date() - center_start);
            console.log("G.ObjParser vertices: " + model.vs.length + " faces: " + model.fs.length + " com: " + model.com + " R: " + model.R);
            console.log("G.ObjParser model built in " + loadTime + "ms" + " centered in " + comTime + "ms" + " Total = " + (new Date() - start) + "ms");
            
            if(onLoad) setTimeout(function(){
					onLoad([model]);
					model = null;
			}, 0);
        }
    }
    
    setTimeout(readfile, 0);
}
G.OffParser = function(manager){
    this.manager  = manager || false;   //TODO
}

G.OffParser.prototype = {
    constructor : G.OffParser,
    parse : function(str, onLoad, onProgress, onError){
        var start = new Date();
        var lines = str.split(/[\r\n]/g);
        var vid = 0;
        var maxLinesToRead = Math.min(100000, lines.length/5);
        var scope = this;
        
        // 10% done when splited the string
        onProgress({status:'parsing', progress:10});
        var li = lines[1].trim().split(/\s+/);
    	var nv = parseInt(li[0]);
        var nf = parseInt(li[1]);
        var cl = 2;
        var model = new G.Model();
        console.log("OFF vertices = " + nv + " faces = " + nf);
        
        var read = function(){
        	for(var i=0;i<maxLinesToRead&&cl<lines.length;i++,cl++)
        	{
        		var line = lines[cl];
        		if(line == "") continue;
        		var ls = line.trim().split(/\s+/);
        		if(cl < nv + 2) {	// vertex
        			var v = new G.Vector3(parseFloat(ls[0]),parseFloat(ls[1]),parseFloat(ls[2]));
                	var vertex = new G.Vertex3(vid++, v);
                	model.vs.push(vertex); 
        		}else {				// face
        			var vid1 = parseInt(ls[1]);
					var vid2 = parseInt(ls[2]);
					var vid3 = parseInt(ls[3]);
					var f = new G.Face3(model.vs[vid1], model.vs[vid2], model.vs[vid3]);
					model.fs.push(f);
        		}
        	}
        	
        	var p = (cl)*100.0/lines.length * 0.9 + 10;
        
        	if(onProgress) onProgress({status: "parsing", progress: p});
        	
        	if(cl < lines.length)
        	{
        		setTimeout(read, 0);
        	}
        	else
        	{
        		var parsedTime = (new Date() - start);
				start = new Date();

				model.com = model.computeCom();
				model.R = model.computeR(model.com);
				model.centerAndScale(model.com, model.R);
			
				var comTime = (new Date() - start);
				console.log("G.OffParser OFF parsed in " + parsedTime + "ms" + ", centered in " + comTime + "ms");
				console.log("G.OffParser vertices: " + model.vs.length + " faces: " + model.fs.length + " com: " + model.com + " R: " + model.R);

				lines = null;			
				if(onLoad) setTimeout(function(){
					onLoad([model]);
					model = null;
				}, 0);
        	}
        };
        
        read();
        
    }
}

G.ParserFactory = {
	getParser: function(ext){
		if(ext === 'json')
			return new G.JSONParser();
		if(ext === 'obj')
			return new G.ObjParser();
		if(ext === 'poly')
			return new G.PolyParser();
		if(ext === 'off')
			return new G.OffParser();
		return null;
	}
};
// PolyLoader.js 
// Author: Zhonghua Xi
// Created: 7/26/2013

G.PolyParser = function(){

};

G.PolyParser.prototype = {
	constructor : G.PolyParser,
	parse : function(str, onLoad, onProgress){
		var lines = str.split(/[\r\n]/g).clean("");
		var l = 0;
	
		while(lines[l][0] == '#') l++;
	
		var polylines = parseInt(lines[l++]);
	
		var polygon = new G.Polygon();
	
		for(var p=0;p<polylines;p++)
		{
			var items = lines[l].trim().split(/\s+/);
			var num = parseInt(items[0]);
			var type = items[1];
			l++;
			var polyline = new G.Polychain();
			polyline.setType(type);
			var vs = [];
			for(var i=0;i<num;i++,l++){
				items = lines[l].trim().split(/\s+/);
				vs.push(new G.Vector2(parseFloat(items[0]), parseFloat(items[1])));
			}
			var orders = items = lines[l++].trim().split(/\s+/).clean("");
			for(var i=0;i<orders.length;i++)
			{
				polyline.vs[parseInt(orders[i])-1] = vs[i];
			}
		
			if(polyline.type == "out")
				polygon.out = polyline;
			else
				polygon.ins.push(polyline);
		}
	
		polygon.com = polygon.computeCom();
		polygon.R = polygon.computeR(polygon.com);
		polygon.centerAndScale(polygon.com, polygon.R);
	
		var models = [polygon];
	
		onLoad(models);
	}
};
/* Heap.js
 * @author Zhonghua Xi
 * @created 8/5/2013
 */

G.Heap = function(arr, comparer, isMaxHeap){
	this.__data = [0];
	this.__size = 0;
	// this.__heapSize = 0;
	this.__comparer = comparer;
	this.__isMaxHeap = (isMaxHeap ? true : false);
	
	if(arr && arr instanceof Array)
	{
		for(var i=0;i<arr.length;i++)
			this.__data.push(arr[i]);
		this.__size = arr.length;
		for(var i=arr.length>>1;i>=1;i--)
			this.__heapify(i);
	}
	
};

G.Heap.prototype = {
	equals: function(heap){
		if(! heap instanceof G.Heap) return false;
		if(heap.size() != this.size()) return false;
		for(var i=0;i<this.size();i++)
			if(this.__data[i] !== heap.__data[i]) return false;
		return true;		
	},
	clone: function(){
		var heap = new G.Heap(null, this.__comparer);
		heap.__data = this.__data.slice(0);
		heap.__size = this.__size;
		heap.__heapSize = this.__heapSize;
	},
	insert: function(element){
		this.__data.push(element);
		this.__size++;
		var current = this.__size;
		var parent = current >> 1;
		while(parent != 0 && this.__compare(current, parent))
		{
			var t = this.__data[parent];
			this.__data[parent] = this.__data[current];
			this.__data[current] = t;
			current = parent;
			parent = current>>1;	
		}
	},
	extract: function(){
		if(this.__size == 0) return null;
		
		var min = this.__data[1];
		
		this.__data[1] = this.__data[this.__size--];
		
		this.__data.pop();	//pop the last element
		
		this.__heapify(1);
		
		return min;
	},
	peek : function(){
		if(this.__size == 0) return null;
		return this.__data[1];
	},
	size : function() {
		return this.__size;
	},
	isMaxHeap : function() {
		return this.__isMaxHeap;
	},
	__heapify: function(index){
		var lc = index*2;
		var rc = index*2+1;
		var nextIndex = index;
	
		if(lc <= this.__size && this.__compare(lc, index))
			nextIndex = lc;
		if(rc <= this.__size && this.__compare(rc, index) && this.__compare(rc, lc))
			nextIndex = rc;
		
		if(nextIndex != index)
		{
			this.__swap(index, nextIndex);
			this.__heapify(nextIndex);
		}
	},
	__compare: function(index1, index2){
		var result;
		if(this.__comparer)
			result = this.__comparer(this.__data[index1], this.__data[index2]);
		else
			result = this.__data[index1] < this.__data[index2];
		return this.__isMaxHeap ? (!result) : result;
	},
	__swap: function(index1, index2)
	{
		var t = this.__data[index1];
		this.__data[index1] = this.__data[index2];
		this.__data[index2] = t;
	},
	toArray : function(){
		var a = [];
		for(var i=0;i<this.__size;i++)
			a.push(this.__data[i+1]);
		return a;
	},
	toSortedArray : function(){
		var a = [];
		var size = this.__size;
		for(var i=0;i<size;i++)
			a.push(this.extract());
		return a;
	}
}

G.Queue = function(){
	this.__size = 0;
	this.__data = [];
};

G.Queue.prototype = {
	equals : function(q){
		if(!q || !(q instanceof G.Queue) || this.__size !== q.__size)
			return false;
		for(var i=0;i<this.__size;i++){
			if(this.__data[i] !== q.__data[i]) return false;
		}
		return true;
	},
	enqueue: function(obj){
		this.__data.push(obj);
		this.__size++;
	},
	dequeue : function(obj){
		if(this.__size === 0)
			return null;
		this.__size --;
		var obj = this.__data.shift();
		return obj;
	},
	peek : function() {
		return this.empty() ? null : this.__data[0];
	},
	empty : function() {
		return this.__size === 0;
	},
	size : function(){
		return this.__size;
	},
	clear : function(){
		this.__size = 0;
		this.__data = [];
	},
	clone : function(){
		var q = new G.Queue();
		for(var i=0;i<this.__size;i++)
			q.enqueue(this.__data[i]);
		return q;
	},
	copyToArray : function(a){
		for(var i=0;i<this.__size;i++)
			a.push(this.__data[i]);
	}
};
G.Stack = function(){
	this.__data = [];
	this.__size = 0;
};

G.Stack.prototype = {
	equals : function(s){
		if(!s || !(s instanceof G.Stack) || this.__size !== s.__size){
			return false;
		}
		for(var i=0;i<this.__size;i++){
			if(this.__data[i] !== s.__data[i]) return false;
		}
		return true;
	},
	push : function(obj){
		this.__data.push(obj);
		this.__size++;
	},
	pop : function() {
		if(this.__size > 0)
		{
			this.__size--;
			var obj = this.__data.pop();
			return obj;
		}else{
			return null;
		}
	},
	peek : function () {
		return this.empty() ? null : this.__data[this.__size-1];
	},
	empty : function() {
		return this.__size === 0;
	},
	size : function() {
		return this.__size;
	},
	clear : function() {
		this.__size = 0;
		this.__data = [];
	},
	clone : function() {
		var s = new G.Stack();
		for(var i=0;i<this.__size;i++)
			s.push(this.__data[i]);
		return s;
	},
	copyToArray : function(a){
		for(var i=0;i<this.__size;i++)
			a.push(this.__data[this.__size - i - 1]);
	}
};
/* Face3.js
 * @author Zhonghua Xi
 * @created 7/22/2013
 */

// v1,v2,v3 : G.Vertex3
G.Face3 = function(v1, v2, v3) {
    this.v1 = v1;
    this.v2 = v2;
    this.v3 = v3;
    this.updateNormal();
}

G.Face3.prototype = {
	toString : function() {
    	return "{" + this.v1 + "," + this.v2 + "," + this.v3 + ", n: " + this.normal + "}"
	},
	toObjString : function() {
    	return "f " + this.v1.vid + " " + this.v2.vid + " " + this.v3.vid;
	},
	updateNormal : function() {
		var e1 = this.v2.pos.sub(this.v1.pos);
		var e2 = this.v3.pos.sub(this.v1.pos);
		this.normal = e1.crossWith(e2).nor();
		return this.normal;
	},
	toTHREEFace3 : function() {
    	return new THREE.Face3(this.v1.vid, this.v2.vid, this.v3.vid, this.normal.toTHREEVector3());
	}
}


/* Line2.js
 * @author Zhonghua Xi
 * @created 7/30/2013
 */

 G.Line2 = function(s, t){
    this.s = (s !== undefined) ? s : new G.Vector2();
    this.t = (t !== undefined) ? s : new G.Vector2();
 };

 G.Line2.prototype = {
    constructor: G.Line2,
    set: function(s, t){
        this.s.copyFrom(s);
        this.t.copyFrom(t);
    },
    clone: function(){
    	return new G.Line2(this.s.clone(), this.t.clone());
    },
    equals: function(l){
    	return l.s.equals(this.s) && l.t.equals(this.t);
    },
    distance: function(){
    	return this.s.dist(this.t);
    },
    distanceSqr: function(){
    	return this.s.distSqr(this.t);
    }
 };

/* Line3.js
 * @author Zhonghua Xi
 * @created 7/30/2013
 */

 G.Line3 = function(s, t){
    this.s = (s !== undefined) ? s : new G.Vector3();
    this.t = (t !== undefined) ? s : new G.Vector3();
 };

 G.Line3.prototype = {
    constructor: G.Line3,
    set: function(s, t){
        this.s.copyFrom(s);
        this.t.copyFrom(t);
    },
    clone: function(){
    	return new G.Line3(this.s.clone(), this.t.clone());
    },
    equals: function(l){
    	return l.s.equals(this.s) && l.t.equals(this.t);
    },
    distance: function(){
    	return this.s.dist(this.t);
    },
    distanceSqr: function(){
    	return this.s.distSqr(this.t);
    }
 };

/* 
 * @author Zhonghua Xi
 */
G.Matrix3 = function(e11, e12, e13, e21, e22, e23, e31, e32, e33){
    this.elements = new Float32Array(9);
    this.set(
    	e11 || 0, e12 || 0, e13 || 0, 
    	e21 || 0, e22 || 0, e23 || 0, 
    	e31 || 0, e32 || 0, e33 || 0);
};

G.Matrix3.prototype = {
    constructor: G.Matrix3,
    set: function(e11, e12, e13, e21, e22, e23, e31, e32, e33){
        var e = this.elements;
        e[0] = e11; e[1] = e12; e[2] = e13;
        e[3] = e21; e[4] = e22; e[5] = e23;
        e[6] = e31; e[7] = e32; e[8] = e33;
        return this;
    },
    identify: function() {
    	this.set(
    		1, 0, 0,
    		0, 1, 0,
    		0, 0, 1
    	);
    	return this;
    },
    scale: function(s) {
    	var e = this.elements;
    	e[0]*=s; e[1]*=s; e[2]*=s;
    	e[3]*=s; e[4]*=s; e[5]*=s;
    	e[6]*=s; e[7]*=s; e[8]*=s;
		return this;    	
    },
    transpose: function () {
		var tmp
		var e = this.elements;

		tmp = e[1]; e[1] = e[3]; e[3] = tmp;
		tmp = e[2]; e[2] = e[6]; e[6] = tmp;
		tmp = e[5]; e[5] = e[7]; e[7] = tmp;

		return this;

	},
    // =======================================
    clone: function() {
        var e = this.elements;
        return new G.Matrix3(
            e[0], e[1], e[2],
            e[3], e[4], e[5],
            e[6], e[7], e[8]
        );
    },
    copyTo : function(m) {
    	var e = this.elements;
        m.set(
            e[0], e[1], e[2],
            e[3], e[4], e[5],
            e[6], e[7], e[8]
        );
    },
    copyFrom: function(m) {
    	var e = m.elements;
        this.set(
            e[0], e[1], e[2],
            e[3], e[4], e[5],
            e[6], e[7], e[8]
        );
    },
    toTHREEMatrix3: function() {
    	var e = this.elements;
    	return new THREE.Matrix3(
    		e[0], e[1], e[2],
            e[3], e[4], e[5],
            e[6], e[7], e[8]
        );
    }
};

/*
 * Vector2 Class
 *
 * @author Zhonghua Xi
 * @created 7/26/2013 
 */
 
G.Vector2 = function(x, y){
	this.x = x ? x : 0
	this.y = y ? y : 0;
}

G.Vector2.prototype = {
	set : function(x, y) {
		this.x = x;
		this.y = y;
	},
	equals: function(v) {
		return ((v.x === this.x) && (v.y === this.y));
	},
	toString : function(){
		return "{" + this.x + "," + this.y + "}";
	},
	clone : function(){
		return new G.Vector2(this.x, this.y);
	},
	copyTo : function(vector2){
    	vector2.set(this.x, this.y);
    	return this;
	},
	copyFrom : function(vector2){
		this.set(vector2.x, vector2.y);
		return this;
	},
	normalSqr : function() {
		return (this.x*this.x + this.y*this.y);
	},
	normal : function() {
		return Math.sqrt(this.normalSqr());
	},
	normalize : function() {
		var n = this.normal();
		return new G.Vector2(this.x/n, this.y/n);
	},
	nor : function(){
		var n = this.normal();
		this.set(this.x/n, this.y/n);
		return this;
	},
	add : function(v) {
		return new G.Vector2(this.x+v.x, this.y+v.y);
	},
	addWith : function(v){
		this.x += v.x;
		this.y += v.y;
		return this;
	},
	sub : function(v) {
		return new G.Vector2(this.x-v.x, this.y-v.y);
	},	
	subWith : function(v){
		this.x -= v.x;
		this.y -= v.y;
		return this;
	},
	dot : function(v){
		return this.x*v.x + this.y*v.y;
	},
	timesWith : function(a){
		this.x*=a;
		this.y*=a;
		return this;
	},
	dist : function(v){
		return Math.sqrt(this.distSqr(v));
	},
	distSqr : function(v){
		return (this.x - v.x)*(this.x - v.x)+(this.y - v.y)*(this.y - v.y);
	},
	toVector3 : function() {
		return new G.Vector3(this.x, this.y, 0);
	},
	toTHREEVector2 : function(){
		return new THREE.Vector2(this.x, this.y);
	}
};


G.Vector3 = function(x,y,z) {
    this.x = (x !== undefined) ? x : 0;
    this.y = (y !== undefined) ? y : 0;
    this.z = (z !== undefined) ? z : 0;
};

G.Vector3.prototype = {
	equals: function(v) {
		return ((v.x === this.x) && (v.y === this.y) && (v.z === this.z));
	},
	toString : function() {
		return "{" + this.x + "," + this.y + "," + this.z + "}";
	},
	normalSqr : function() {
		return (this.x*this.x + this.y*this.y + this.z*this.z);
	},
	normal : function() {
		return Math.sqrt(this.normalSqr());
	},
	normalize : function() {
		var n = this.normal();
		var s = n === 0 ? 0 : 1/n;
		return new G.Vector3(this.x*s, this.y*s, this.z*s);
	},
	nor : function(){
		var n = this.normal();
		var s = n === 0 ? 0 : 1/n;
		this.x *= s;
		this.y *= s;
		this.z *= s;
		return this;
	},
	clone : function() {
		return new G.Vector3(this.x, this.y, this.z);
	},
	copyTo : function(vector3){
    	vector3.set(this.x, this.y, this.z);
    	return this;
    },
	copyFrom : function(vector3){
		this.set(vector3.x,vector3.y,vector3.z);
		return this;
	},
	add : function(v){
		return new G.Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
	},
	addWith : function(v){
		this.x += v.x;
		this.y += v.y; 
		this.z += v.z;
		return this;
	},
	addWithV2 : function(v2){
		this.x += v2.x;
		this.y += v2.y; 
		return this;
	},
	sub : function(v){
		return new G.Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
	},
	subWith : function(v){
		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;
		return this;
	},
	subWithV2 : function(v2){
		this.x -= v2.x;
		this.y -= v2.y;
		return this;
	},
	dot : function(v){
		return this.x*v.x + this.y*v.y + this.z*v.z;
	},
	times : function(n){
		return new G.Vector3(this.x*n, this.y*n, this.z*n);
	},
	timesWith : function(n){
		this.x*=n;
		this.y*=n;
		this.z*=n;
		return this;
	},
	divideWith : function(n){
		if( n !== 0)
		{
			var s = 1/n;
			this.x *= s;
			this.y *= s;
			this.z *= s;
		}
		else
		{
			this.x = 0;
			this.y = 0;
			this.z = 0;
		}
		return this;
	},
	set : function(x,y,z){
		this.x = x ? x : 0;
		this.y = y ? y : 0;
		this.z = z ? z : 0;
		return this;
	},
	cross : function(v){
		return new G.Vector3(this.y*v.z - this.z*v.y,
					  this.z*v.x - this.x*v.z,
					  this.x*v.y - this.y*v.x);
	},
	crossWith : function(v){
		var x = this.y*v.z - this.z*v.y;
		var y = this.z*v.x - this.x*v.z;
		var z = this.x*v.y - this.y*v.x;
		this.x = x;
		this.y = y;
		this.z = z;
		return this;
	},
	distSqr : function(vector3){
		var distSqr = 
		 (this.x - vector3.x)*(this.x - vector3.x)
	   + (this.y - vector3.y)*(this.y - vector3.y)
	   + (this.z - vector3.z)*(this.z - vector3.z);
		return distSqr;
	},
	distSqrV2 : function(vector2){
		var distSqr = 
		 (this.x - vector2.x)*(this.x - vector2.x)
	   + (this.y - vector2.y)*(this.y - vector2.y)
	   + (this.z*this.z);
		return distSqr;
	},
	dist : function(vector3){
    	return Math.sqrt(this.distSqr(vector3));
	},
	applyMatrix3 : function(m3){
	
		var tx = this.x, ty = this.y, tz = this.z;
	
		var e = m3.elements;

		this.x = e[0] * tx + e[3] * ty + e[6] * tz;
		this.y = e[1] * tx + e[4] * ty + e[7] * tz;
		this.z = e[2] * tx + e[5] * ty + e[8] * tz;

		return this;
	},
	toVector2: function(){
		return new G.Vector2(this.x, this.y);
	},
	toTHREEVector3 : function(){
		return new THREE.Vector3(this.x, this.y, this.z);
	}
}

G.Model = function(){
        this.vs = [];   //Vertices, Array of G.Vector3
        this.fs = [];   //Faces, Array of G.Triangle, vid index start with 0
        this.COM = new G.Vector3();
        this.R = 0.0;
        this.self = this;
}

G.Model.prototype.dumpObj = function(){
    var ss = [];
    for(var i=0;i<this.vs.length;i++)
    {
        ss.push(this.vs[i].toObjString());
    }
    for(var i=0;i<this.fs.length;i++)
    {
        ss.push(this.fs[i].toObjString());
    }
    return ss.join('\n');
}

G.Model.prototype.computeCom = function(){
    var com = new G.Vector3(0,0,0);
    for(var i=0;i<this.vs.length;i++)
        com.addWith(this.vs[i].pos);
    com.timesWith(1.0/this.vs.length);
    return com;
}

G.Model.prototype.computeR = function(com){
    var r = 0;
    for(var i=0;i<this.vs.length;i++)
    {
        var d = this.vs[i].pos.sub(com).normalSqr();
        if(d>r) r=d;
    }
    return Math.sqrt(r);
}

G.Model.prototype.centerAndScale = function(com, r){
    var scale = 1.0/r;
    for(var i=0;i<this.vs.length;i++)
    {
        this.vs[i].pos.subWith(com).timesWith(scale); 
    }
}

G.Model.prototype.toTHREEGeometry = function(){
    var g3 = new THREE.Geometry();
    g3.vertices = new Array(this.vs.length);
    g3.faces = new Array(this.fs.length);
    for(var i=0;i<this.vs.length;i++)
        g3.vertices[i] = this.vs[i].pos.toTHREEVector3();
    for(var i=0;i<this.fs.length;i++)
        g3.faces[i] = this.fs[i].toTHREEFace3();
    return g3;
}

G.Model.prototype.dispose = function() {
	this.vs = null;
	this.fs = null;
	this.self = null;
};

/* ModelHelper.js
 * @author Zhonghua Xi
 * @created 7/31/2013
 */
 
G.ModelHelper = {
	computeCOM : function(models){
		var com = new G.Vector3(0,0,0);
		var count = 0;
		$.each(models, function(index, model){
			if(model instanceof G.Model){
				count += model.vs.length;
				for(var i=0;i<model.vs.length;i++)
					com.addWith(model.vs[i].pos);
			}else if(model instanceof G.Polygon){
				count += model.out.vs.length;
				for(var i=0;i<model.out.vs.length;i++)
					com.addWithV2(model.out.vs[i]);
			} 
		});
		var s = 1.0/count;
		return com.timesWith(s,s,s);
	},
	computeR : function(models, com){
		var r = 0;
		$.each(models, function(index, model){
			if(model instanceof G.Model){
				for(var i=0;i<model.vs.length;i++)
				{
					var d = com.distSqr(model.vs[i].pos);
					if(d>r) r = d;
				}
			}else if(model instanceof G.Polygon){
				var com2 = com.toVector2();
				for(var i=0;i<model.out.vs.length;i++)
				{
					var d = com.distSqrV2(model.out.vs[i]);
					if(d>r) r = d;
				}
			} 
		});
		
		return Math.sqrt(r);
	},
	normalize : function(models, com, R){
		var s = 1.0/R;
		var comV2 = com.toVector2();
		$.each(models, function(index, model){
			if(model instanceof G.Model){
				for(var i=0;i<model.vs.length;i++)
					model.vs[i].pos.subWith(com).timesWith(s);
			}else if(model instanceof G.Polygon){
				for(var i=0;i<model.out.vs.length;i++)
					model.out.vs[i].subWith(comV2).timesWith(s);
				for(var j=0;j<model.ins.length;j++){
					var pc = model.ins[j];
					var len = pc.vs.length;
					for(var i=0;i<len;i++){
						pc.vs[i].subWith(comV2).timesWith(s);
					}
				}
			} 
		});
	}
};
/*
 * Polychain Class
 *
 * @author Zhonghua Xi
 * @created 7/26/2013 
 */
 
G.Polychain = function(pts, type){
	this.vs = [];
	if(pts instanceof Array && pts[0] instanceof G.Vector2)
		this.vs = pts;
	this.setType(type);
}

G.Polychain.prototype = {
	toString : function() {
		return "{vertices:" + this.vs.length + ", type:" + this.type + "}";
	},
	dumpPoly : function() {
		var s = [];
		s.push(this.vs.length);
		s.push(this.type);
	
		for(var i=0;i<this.vs.length;i++)
			s.push("" + this.vs[i].x + " " + this.vs[i].y);
	
		return s.join('\n');
	},
	setType : function(type){
		if(type == "out" || type == "in")
			this.type = type;
		return this;
	},
	dispose : function(){
		this.vs = [];
	}
}
G.Polygon = function(){
	this.out = null;
	this.ins = [];
	this.com = new G.Vector2();
	this.R = 0;
}

G.Polygon.prototype = {
	dumpPoly : function(){
		var ss = [];
		ss.push((1 + this.ins.length));
		ss.push(this.out.dumpPoly());
		for(var i=0;i<this.ins.length;i++)
			ss.push(this.ins[i].dumpPoly());
		return ss.join('\n');
	},
	toTHREEGeometry : function(){
	if(!THREE || !this.out) return null;
	
		var pts = [];
	
		for(var i=0;i<this.out.vs.length;i++)
			pts.push(this.out.vs[i].toTHREEVector2());
	
		var shape = new THREE.Shape(pts);
	
		for(var h=0;h<this.ins.length;h++)
		{
			pts = [];
			for(var i=0;i<this.ins[h].vs.length;i++)
				pts.push(this.ins[h].vs[i].toTHREEVector2());
			shape.holes.push(new THREE.Shape(pts));
		}
	
	
		return new THREE.ExtrudeGeometry(shape, { amount: 0.05, bevelEnabled: false });
	},
	computeCom : function(){
		var com = new G.Vector2(0,0);
		if(this.out && this.out.vs.length>0)
		{
			for(var i=0;i<this.out.vs.length;i++)
			{
				com.addWith(this.out.vs[i]);
			}
			com.timesWith(1.0/this.out.vs.length);
		}
		return com;
	},
	computeR : function(com){
		var r = 0;
		if(!this.out) return r;
		for(var i=0;i<this.out.vs.length;i++)
		{
			var d = this.out.vs[i].distSqr(com);
			if(d>r) r=d;
		}
		return Math.sqrt(r);
	},
	centerAndScale : function(com, r){
		var scale = 1.0/r;
		if(!this.out) return;
		for(var i=0;i<this.out.vs.length;i++)
		{
			this.out.vs[i].subWith(com).timesWith(scale); 
		}
		for(var p=0;p<this.ins.length;p++)
		{
			for(var i=0;i<this.ins[p].vs.length;i++)
			{
				this.ins[p].vs[i].subWith(com).timesWith(scale); 
			}
		}
	},
	dispose : function(){
		var self = this;
		if(this.out){
			this.out.dispose();
			this.out = null;
		}
		$.each(this.ins, function(index, polychain){
			polychain.dispose();
		});
		this.ins = [];
	}
}
// Triagnle.js
// Author: Zhonghua Xi
// Created 7/26/2013

G.Triangle = function(vid1, vid2, vid3) {
     this[0] = vid1;
     this[1] = vid2;
     this[2] = vid3;
}

/* Vertex2.js
 * @author Zhonghua Xi
 * @created 7/30/2013
 */
 
G.Vertex2 = function(vid, vector2) {
    this.vid = vid;
    this.pos = vector2;
}

G.Vertex2.prototype = {
	clone : function(){
    	return new G.Vertex(this.vid, this.pos.clone());
	},
	toString : function(){
    	return "{" + this.vid + " : " + this.pos.toString() + "}";
	}
}

/* Vertex.js
 * @author Zhonghua Xi
 * @created 7/23/2013
 */
 
G.Vertex3 = function(vid, vector3) {
    this.vid = vid;
    this.pos = vector3;
}

G.Vertex3.prototype = {
	clone : function(){
    	return new G.Vertex(this.vid, this.pos.clone());
	},
	toObjString : function() {
    	return "v " + this.pos.x + " " + this.pos.y + " " + this.pos.z;
	},
	toString : function(){
    	return "{" + this.vid + " : " + this.pos.toString() + "}";
	}
}

