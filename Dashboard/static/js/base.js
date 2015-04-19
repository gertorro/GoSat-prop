var uC;
var tempData=[];
var open=false;
var api = "http://10.5.1.163:5000/";
var blocking = false;
var led=false;
var motor=false;
$(function(){

		var usersData = {
		 labels: ["", "", "", "", "", "", "", "", "", "", "" , "", "", ""],		        

		    datasets: [
		        {
		            fillColor: "rgba(241,252,230,.0)",
		            strokeColor: "#3BACC6",
		            pointColor: "#3BACC6",
		            scaleShowLabels : false,
		            pointStrokeColor: "#fff",
		            pointHighlightFill: "#fff",
		            pointHighlightStroke: "#94D250",
		            data: []
		        },
		         {
		            fillColor: "rgba(241,252,230,.0)",
		            strokeColor: "#64b167",
		            pointColor: "#64b167",
		            scaleShowLabels : false,
		            pointStrokeColor: "#fff",
		            pointHighlightFill: "#fff",
		            pointHighlightStroke: "#94D250",
		            data: []
		        },
		        
		    ]
		};
		// Get the context of the canvas element we want to select
		var usersChart = document.getElementById("usersChart").getContext("2d");
		uC = new Chart(usersChart).Line(usersData, {
			 scaleShowLabels : false,
			 barShowLables: true,

		});
		
		$("#nave").click(function(){
			_t = this;
			blocking = true;
			n = "0";
			if(!open){ n="1"; $(_t).addClass("active"); open=true;}else{ $(_t).removeClass("active");open=false;}
			if(!motor){ m ="0";} else{ m ="1";}
			if(!led){ l ="0";} else{ l="1";}
			$.get( api+"open/"+n+"/"+m+"/"+l+"/0", function( data ) {
			 	
			 	setTimeout('blocking=false', 2000);
			});

		});
		$("#led").click(function(){
			if(!open){ n="0"; }else{ n="1";}
			if(!led){ l ="1"; $(this).removeClass("opac");led=true;} else{ l="0";  $(this).addClass("opac");led=false;}
			if(!motor){ m ="0";} else{ m ="1";}
			$.get( api+"open/"+n+"/"+m+"/"+l+"/0", function( data ) {
			 	
			 	setTimeout('blocking=false', 2000);
			});
			
		});

		$("#motor").click(function(){
			if(!open){ n="0"; }else{ n="1";}
			if(!led){ l ="0";} else{ l="1";}
			if(!motor){ m ="1"; $(this).removeClass("opac");motor=true;} else{ m="0";  $(this).addClass("opac");motor=false;}
			
			$.get( api+"open/"+n+"/"+m+"/"+l+"/0", function( data ) {
			 	
			 	setTimeout('blocking=false', 2000);
			});
			
		});
				
		
		//$(".v-grid").css("left", $(".video img").eq(0).position().left+$(".video img").eq(0).width()/2);
		//$(".h-grid").css("top", $(".vgrid").eq(0).height()/2);
		
	
		
});

		
		function paintT(t1, t2){
			if(uC.datasets[0].points.length>20){
				uC.removeData();
			}
			uC.addData([t1, t2], "");
			$("#t1").html(t1+"º");
			$("#t2").html(t2+"º");
			
		}
		function paint(status){
			if(Math.floor((Math.random() * 10) + 1)==1){
				paintT(status['t1'], status['t2']);
			}
			/*
			$(".inner").eq(0).animate({  textIndent: status['z'] }, {
			    step: function(now,fx) {
			      $(this).css('-webkit-transform','rotate('+now+'deg)'); 
			    },
			    duration:50
			},'linear');
			*/
			$(".inner").eq(0).css('-webkit-transform','rotate('+(status['z']-90)+'deg)'); 
			//$(".inner").eq(0).css("transform", "rotate("+status['x']+"deg)");				
			//$(".battery-fill").eq(0).css("width", status[])
		
			window.frames[0].frameElement.contentWindow.paint((status['z']-90)/180*Math.PI, 45/180*Math.PI, status['x']/180*Math.PI);
			$("#wingl").css("opacity", status['lightl']/100);
			$("#wingr").css("opacity", status['lightr']/100);
			$("#deg-in").html(parseInt((status['z']-90))+" deg");
			$("#battery1").animate({
				"height":status['battery1']
			},100, 'linear');

			$("#battery2").animate({
				"height":status['battery2']
			},100, 'linear');
			
			$("#battery3").animate({
				"height":status['battery3']
			},100, 'linear');
							

			
		}
		function getStatus(){
			if(!blocking){
			$.get( api+"status/", function( data ) {
			 	paint(data);
			});
			}
		}
		function startQ(){
			setInterval('getStatus()', 1000);
			
		}
		setTimeout('startQ()', 1000);	
		//setInterval('getStatus()', 100);