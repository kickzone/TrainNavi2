//ベジェ曲線用のオブジェクト
var TNBezier = function(sp1_lat, sp1_lon, sp2_lat, sp2_lon){
	this.sp1 = {};
	this.sp1.latitude = sp1_lat;
	this.sp1.longitude = sp1_lon;
	this.sp2 = {};
	this.sp2.latutide = sp2_lat;
	this,sp2.longitude = sp2_lon;
}