

googleRetrieveLinksFromPage(document);

//scraper
function googleRetrieveLinksFromPage(document) 
{
	console.log('');
	console.log('googleRetrieveLinksFromPage():');
	var results = document.getElementsByClassName('med');
	
	var snippetText = '';
	var date = '';
	var title = '';
	var link = '';
	var rank = 1;

	var payload = {};

	for(var i=0; i<results.length; i++)
	{
		var liOrDivs = results[i].getElementsByClassName('g');
		for(var j=0; j<liOrDivs.length; j++)
		{
			var liOrDiv = liOrDivs[j];
			if( liOrDiv.tagName !== 'DIV' && liOrDiv.tagName !== 'LI' )
			{
				continue;
			}

			var snippet = liOrDiv.getElementsByClassName('st');
			var titleLink = liOrDiv.getElementsByTagName('h3');
			

			if( window.location.href.indexOf('&tbm=nws') == -1 )
			{
				//general serp
				var returnObj = googleSerpGetSnippetCrawldatetime(snippet);
				snippetText = returnObj.snippet;
				date = returnObj.date;
			}
			else
			{
				//news vertical
				snippetText = snippet[0].innerHTML;
				var d = liOrDiv.getElementsByClassName('f');
				if( d.length != 0 )
				{
					date = d[0].innerHTML;
				}
			}
			

			if( titleLink.length != 0 )
			{
				titleLink = titleLink[0].getElementsByTagName('a');
				title = titleLink[0].innerHTML;
				link = titleLink[0].href;

				payload[link] = {title: title, 'crawl-datetime': date, snippet: snippetText, rank: rank};
				rank++;
				//payload[link] = {title: title, 'crawlDatetime': date, snippet: snippetText};
			}
		}
	}

	return payload;
}

function googleSerpGetSnippetCrawldatetime(snippet)
{
	var returnObj = {snippet: '', date: ''};

	if( snippet.length != 0 )
	{
		if( snippet[0].tagName === 'SPAN' )
		{
			snippet = snippet[0].innerHTML.trim();
			returnObj.snippet = snippet;

			var indexOfEndSpan = snippet.indexOf('</span>');
			if( indexOfEndSpan != -1 )
			{
				//</span> is 7
				crawlDateTime = snippet.substr(0, indexOfEndSpan+7);
				
				//snippet contains crawlDateTime
				snippet = snippet.replace(crawlDateTime, '');

				//remove tags from crawlDateTime
				crawlDateTime = crawlDateTime.replace('<span class="f">', '');
				crawlDateTime = crawlDateTime.replace(' - </span>', '');

				returnObj.snippet = snippet;
				returnObj.date = crawlDateTime;
			}
		}
	}

	return returnObj;
}

