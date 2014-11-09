/*通過点オブジェクト*/
var TNHalfway = function(line, text){
	this.line = line;
	var elements = text.split(",");
	this.kilo = parseFloat(elements[0]);
	this.latitude = parseFloat(elements[1]);
	this.longitude = parseFloat(elements[2]);
	this.sp1_1 = null;
	this.sp1_2 = null;
	if(parseFloat(elements[3]) != 0)
	{
		this.sp1_1 = {};
		this.sp1_1.latitude = parseFloat(elements[3]);
		this.sp1_1.longitude = parseFloat(elements[4]);
		this.sp1_2 = {};
		this.sp1_2.latitude = parseFloat(elements[5]);
		this.sp1_2.longitude = parseFloat(elements[6]);
	}
	this.sp2_1 = null;
	this.sp2_2 = null;
	if(parseFloat(elements[7]) != 0)
	{
		this.sp2_1 = {};
		this.sp2_1.latitude = parseFloat(elements[7]);
		this.sp2_1.longitude = parseFloat(elements[8]);
		this.sp2_2 = {};
		this.sp2_2.latitude = parseFloat(elements[9]);
		this.sp2_2.longitude = parseFloat(elements[10]);
	}
}