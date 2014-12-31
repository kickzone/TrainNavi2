/*グローバルな関数を提供するモジュール*/
var TNFuncs = (function(){

	//private
	var GMAP_COEFX = 0.835;
	var GMAP_COEFY = 1.281;


	//ベクトルの長さを計算
	function norm(p){
		return Math.sqrt(Math.pow(p.x, 2) + Math.pow(p.y, 2));
	}

	//p1p2, p3p2の角の二等分線を単位ベクトルで得る
	function calcBisectUnitVector(p1, p2, p3)
	{
		var ret = {};
		//単位ベクトル同士を足すと出来上がり
		var p1p2 = {x: p2.x - p1.x, y: p2.y - p1.y};
		var nrmp1p2 = norm(p1p2);
		var p3p2 = {x: p2.x - p3.x, y: p2.y - p3.y};
		var nrmp3p2 = norm(p3p2);
		var bisect = {x: p1p2.x/nrmp1p2 + p3p2.x/nrmp3p2, y: p1p2.y/nrmp1p2 + p3p2.y/nrmp3p2};
		if(bisect.x == 0 && bisect.y == 0){
			//1直線上に3点があった場合、打ち消しあって0になってしまう
			//このときはp1p2の法線をリターン
			return calcNormalUnitVector(p1, p2);
		}

		var nrmBisect = norm(bisect);
		bisect.x /= nrmBisect;
		bisect.y /= nrmBisect;

		//p1p2の左側に二等分線が来るようにしたい
		//p1p2と外積をとって、正なら反転させる
		var cp = p1p2.x * bisect.y - p1p2.y * bisect.x;
		if(cp > 0){
			bisect.x = -bisect.x;
			bisect.y = -bisect.y;
		}

		return bisect;
	}

	//p1p2の法線単位ベクトルを得る
	//左90度回転
	function calcNormalUnitVector(p1, p2)
	{
		//(x, y)の左90度回転ベクトルは(-y, x)
		//しかしながら、PCの座標系はyが反転しているので、(y, -x)にしないといけない
		var normalVec = {x: p2.y - p1.y, y: p1.x - p2.x};
		var nrmNormal = norm(normalVec);
		normalVec.x /= nrmNormal;
		normalVec.y /= nrmNormal;
		return normalVec;
	}

	//緯度、経度1度当たり何ピクセルになるのか、の係数を得る
	//参考：http://www.nanchatte.com/map/circle.html
	function calcCoefXY(lat, scale){
		//ラジアンの角度
		var latRadian = lat * Math.PI / 180;

		// 赤道半径(m) (WGS-84)
		var EquatorialRadius = 6378137;

		// 扁平率の逆数 : 1/f (WGS-84)
		var F = 298.257223;

		// 離心率の２乗
		var E = ((2 * F) -1) / Math.pow(F, 2);

		// 赤道半径 × π
		var PI_ER = Math.PI * EquatorialRadius;

		// 1 - e^2 sin^2 (θ)
		var TMP = 1 - E * Math.pow(Math.sin(latRadian), 2);

		// 経度１度あたりの長さ(m)
		var arc_lat = (PI_ER * (1 - E)) / (180 * Math.pow(TMP, 3/2));

		// 緯度１度あたりの長さ(m)
		var arc_lng = (PI_ER * Math.cos(latRadian)) / (180 * Math.pow(TMP, 1/2));

		//googlemapに適合させるための係数をかける
		arc_lat *= GMAP_COEFX;
		arc_lng *= GMAP_COEFY;

		return {X : arc_lat / scale, Y : arc_lng / scale};
	}

	//省略名称を得る
	function getDestStr(str, view){
		if(view == 2){
			//省略駅名
			if(str == "新松田")	return '松';
			if(str == "相武台前") return '武';
			if(str == "京王八王子") return "八";
			if(str == "京王多摩センター") return "多";
			if(str == "東葉勝田台") return "葉";
			if(str == "小手指") return "指";
			if(str == "西武秩父") return "秩";
			if(str == "西武球場前") return "球";
			if(str == "新木場") return "木";
			if(str == "京成臼井") return "臼";
			if(str == "京成佐倉") return "佐";
			if(str == "京成津田沼") return "津";
			if(str == "京急久里浜") return "久";
			if(str == "京急川崎") return "川";
			if(str == "京急久里浜") return "久";
			if(str == "京成高砂") return "高";


			return str.charAt(0);
		}
		return str;
	}

	//矩形が重なるかどうか
	function isRectOverlapped(xmin1, ymin1, xmax1, ymax1, xmin2, ymin2, xmax2, ymax2){
		return !(xmin1 > xmax2 || ymin1 > ymax2 || xmax1 < xmin2 || ymax1 < ymin2)
	}


	//googlemapを使ったとき限定、latlng→実際の座標に変換する
	function fromLatLngToPoint(latLng, map) {
		var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
		var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
		var scale = Math.pow(2, map.getZoom());
		var worldPoint = map.getProjection().fromLatLngToPoint(latLng);
		return new google.maps.Point((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);
	}

	function fromPointToLatLng(point, map) {
		var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
		var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
		var scale = Math.pow(2, map.getZoom());
		var worldPoint = new google.maps.Point(bottomLeft.x + point.x / scale, topRight.y + point.y / scale);
		var latlng = map.getProjection().fromPointToLatLng(worldPoint);
		return latlng;
	}

	//public
	return{
		calcBisectUnitVector: calcBisectUnitVector,
		calcNormalUnitVector: calcNormalUnitVector,
		getDestStr : getDestStr,
		calcCoefXY : calcCoefXY,
		GMAP_CoefX : GMAP_COEFX,
		GMAP_CoefY : GMAP_COEFY,
		isRectOverlapped : isRectOverlapped,
		fromLatLngToPoint : fromLatLngToPoint,
		fromPointToLatLng : fromPointToLatLng,
	};


})();