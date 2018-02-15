if( window.location.href.indexOf('/status/') != -1 )
{
	var trends = document.getElementsByClassName('trends-inner');
	if( trends.length != 0 )
	{
		trends[0].scrollIntoView();	
	}
}
else
{
	window.scrollTo(0, document.body.scrollHeight);
}