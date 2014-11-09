/*画面表示担当のモジュール*/
var TNView = (function(cj){

	//private

	//路線オブジェクト TNModelと共有する
	var lines;

	//TNModelの参照
	var Model;

	//現在の倍率
	var scale;

	//線路を描画
	function DrawLines()
	{
	}

	//public
	return{
		init: function()
		{
			Model = TNModel;
			lines = Model.GetLines();
		}
	};

})(createjs);