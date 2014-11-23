/*グローバルな関数を提供するモジュール*/
var TNFuncs = (function(){

	//private

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

	//public
	return{
		calcBisectUnitVector: calcBisectUnitVector,
		calcNormalUnitVector: calcNormalUnitVector
	};

})();