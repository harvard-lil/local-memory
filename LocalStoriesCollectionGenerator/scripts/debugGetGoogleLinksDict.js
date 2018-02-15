/*
expr::getGoogleLinksDict.js:
	test	

lmp::getGoogleLinksDict.js:
	update with debugGetGoogleLinksDict.js after debugGetGoogleLinksDict.js fulfills rigorous tests
	test

backup col resu
	fix google links

genericCommon.py::googleGetSERPResults()
	update with logic from debugGetGoogleLinksDict.js, more links?
*/

var getAdditionalLinks = false;//switched of due to ongoing collection building experiment, true in live version
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
	var rank = 0;

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
			
			//get date and snippet
			if( window.location.href.indexOf('&tbm=nws') == -1 )
			{
				//general serp
				var returnObj = googleSerpGetSnippetCrawldatetime(snippet);
				snippetText = returnObj.snippet;
				date = returnObj.date;
			}
			else
			{
				snippetText = '';
				date = '';
				//news vertical
				if( snippet.length != 0 )
				{
					snippetText = snippet[0].innerHTML;
					var d = liOrDiv.getElementsByClassName('f');
					if( d.length != 0 )
					{
						date = d[0].innerHTML;
					}
				}
			}
			

			if( titleLink.length != 0 )
			{
				titleLink = titleLink[0].getElementsByTagName('a');
				if( titleLink.length != 0 )
				{

					titleLink = titleLink[0];
					title = titleLink.innerHTML;
					if( titleLink.hasAttribute('data-href') == true )
					{
						link = titleLink.getAttribute('data-href');
					}
					else
					{
						link = titleLink.href;	
					}

					if( link.length != 0 )
					{
						rank++;
						payload[link] = getPayloadDetails(title, date, snippetText, rank);
					}

				}
			}



			//attempt to get more links - start
			if( getAdditionalLinks == true )
			{
				addMoreLinks(liOrDiv, rank, payload);
			}
			//attempt to get more links - end
		}

		//attempt to add even more links - start
		if( getAdditionalLinks == true )
		{
			addMoreLinks(results[i], rank, payload);
		}
		//attempt to add even more links - end
	}

	return payload;
}

function getPayloadDetails(title, crawlDatetime, snippet, rank, custom) 
{
	if( custom == undefined )
	{
		custom = {};
	}
	return {title: title, 'crawl-datetime': crawlDatetime, snippet: snippet, rank: rank, custom: custom};
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

function addMoreLinks(elm, rank, payload) 
{
	var moreLinks = elm.getElementsByTagName('a');
	let subrank = 1;
	for(var k=0; k<moreLinks.length; k++)
	{
		if( moreLinks[k].hostname.indexOf('google.com') != -1 )
		{
			//skip google links
			continue;
		}

		let link = '';
		if( moreLinks[k].hasAttribute('data-href') == true )
		{
			link = moreLinks[k].getAttribute('data-href');
		}
		else
		{
			link = moreLinks[k].href;
		}

		if( payload[link] == undefined )
		{
			let title = moreLinks[k].innerText.trim();
			if( title.length != 0 )
			{
				let locRank = rank + '.' + subrank;
				locRank = +locRank;
				
				let custom = {'extra-link': true};

				payload[link] = getPayloadDetails(title, '', '', locRank, custom);
				subrank++;
			}
		}
	}
}