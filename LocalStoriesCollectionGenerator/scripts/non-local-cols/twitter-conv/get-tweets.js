
twitterGetDescendants();
function twitterGetTweetIfExist(potentialTweetDiv)
{
	var tweetDict = {};
	var listOfTweetAttrs = ['data-tweet-id', 'data-name', 'data-screen-name'];
	var attr;
	for(var i=0; i<listOfTweetAttrs.length; i++)
	{
		attr = listOfTweetAttrs[i];
		if( potentialTweetDiv.hasAttribute(attr) )
		{
			tweetDict[attr] = potentialTweetDiv.getAttribute(attr);
		}
	}

	if( Object.keys(tweetDict).length == listOfTweetAttrs.length )
	{
		tweetDict['tweet-text'] = '';
		tweetDict['tweet-time'] = '';
		tweetDict['tweet-links'] = [];
		//tweetDict['data-conversation-id'] = '';
		//tweetDict['data-mentions'] = '';//parent, self-reference if without parent (root node)
		var uniformAccessAttrs = ['data-conversation-id', 'data-mentions'];
		
		var tweetTag = potentialTweetDiv.getElementsByClassName('tweet-text');
		if( tweetTag.length != 0 )
		{
			tweetDict['tweet-text'] = tweetTag[0].innerText;
		}

		tweetTag = potentialTweetDiv.getElementsByClassName('tweet-timestamp');
		if( tweetTag.length != 0 )
		{
			if( tweetTag[0].hasAttribute('title') )
			{
				tweetDict['tweet-time'] = tweetTag[0].getAttribute('title');
			}
		}

		for(var i=0; i<uniformAccessAttrs.length; i++)
		{
			attr = uniformAccessAttrs[i];
			tweetDict[attr] = '';
			
			if( potentialTweetDiv.hasAttribute(attr) )
			{
				tweetDict[attr] = potentialTweetDiv.getAttribute(attr);
			}
		}

		tweetDict['tweet-links'] = twitterGetLinksFromTweetDiv(potentialTweetDiv);

		return tweetDict;
	}
	else
	{
		return {};
	}
}

function twitterGetDescendants()
{
	var tweetsDict = {};
	var tweets = document.getElementsByClassName('tweet');

	for(var i=0; i<tweets.length; i++)
	{
		var tweet = twitterGetTweetIfExist(tweets[i]);
		if( Object.keys(tweet).length != 0 )
		{
			tweetsDict[ tweet['data-tweet-id'] ] = tweet;
		}
	}

	return tweetsDict;
}

function twitterGetLinksFromTweetDiv(tweetDivTag)
{
	var tweetTextTag = tweetDivTag.getElementsByClassName('tweet-text');
	var links = [];
	var expandedLinks = [];

	if( tweetTextTag.length == 0 )
	{
		return [];
	}

	tweetTextTag = tweetTextTag[0];
	links = tweetTextTag.getElementsByTagName('a');
	
	for(var i = 0; i<links.length; i++)
	{
		if( links[i].hasAttribute('data-expanded-url') === true )
		{
			expandedLinks.push( links[i].getAttribute('data-expanded-url') );
		}
	}

	return expandedLinks;
}

