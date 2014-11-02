/*データベースの内容を読み込み、保持、TNModelからの要請に応じてデータを返すモジュール*/
var TNDb = (function(){

	//private

	//パッケージファイルを使うかどうか
	//使わない場合はDBを読む
	var packageFile = "";

	//スキンファイル(現時点無効)
	var skinFile = "";

	//有効な路線一覧
	var validLines = [];

	//オプション
	var options = {};

	function ReadTrainsFromDB(fromTime, toTime)
	{

	}

	function ReadTrainsFromPackage(fromTime, toTime)
	{

	}

	function ReadLinesFromDB()
	{

	}

	function ReadLinesFromPackage()
	{

	}

	//public
	return{
		setPackageFile : function(name)
		{
			packageFile = name;
		},

		AddValidLines : function(line)
		{
			validLines.push(line);
		},
		//路線、駅などのデータ読み込み(静的でよい)
		ReadLines : function()
		{
			if(packageFile == "") ReadLinesFromDB();
			else ReadLinesFromPackage();
		},
		//列車の読み込み
		ReadTrains : function(fromTime, toTime)
		{
			if(packageFile == "") ReadTrainsFromDB(fromTime, toTime);
			else ReadTrainsFromPackage(fromTime, toTime);
		}
	};

})();

