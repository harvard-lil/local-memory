googleRetrieveLinksFromPage(document);

//scraper
function googleRetrieveLinksFromPage(document) 
{
	console.log('googleRetrieveLinksFromPage():');
	var results = document.getElementsByClassName('srg');
	
	var snippetText = '';
	var crawlDateTime = '';
	var title = '';
	var link = '';

	var payload = {};

	for(var i=0; i<results.length; i++)
	{
		var liOrDivs = results[i].getElementsByClassName('g');
		for(var j=0; j<liOrDivs.length; j++)
		{
			var liOrDiv = liOrDivs[j];
			if( liOrDiv.tagName === 'DIV' || liOrDiv.tagName === 'LI' )
			{	
				var snippet = liOrDiv.getElementsByClassName('st');
				var titleLink = liOrDiv.getElementsByTagName('h3');
				
				if( snippet.length != 0 )
				{
					if( snippet[0].tagName === 'SPAN' )
					{
						snippet = snippet[0].innerHTML;
						snippetText = snippet;

						var indexOfEndSpan = snippet.indexOf('</span>');
						if( indexOfEndSpan != -1 )
						{
							//</span> is 7
							crawlDateTime = snippet.substr(0, indexOfEndSpan+7);
							
							//snippet contains crawlDateTime
							snippet = snippet.replace(crawlDateTime, '');
							snippetText = snippet;

							//remove tags from crawlDateTime
							crawlDateTime = crawlDateTime.replace('<span class="f">', '');
							crawlDateTime = crawlDateTime.replace(' - </span>', '');
						}
					}
				}

				if( titleLink.length != 0 )
				{
					titleLink = titleLink[0].getElementsByTagName('a');
					title = titleLink[0].innerHTML;
					link = titleLink[0].href;
				}

				payload[link] = {title: title, crawlDatetime: crawlDateTime, snippet: snippetText};
			}
		}
	}

	return payload;
}
