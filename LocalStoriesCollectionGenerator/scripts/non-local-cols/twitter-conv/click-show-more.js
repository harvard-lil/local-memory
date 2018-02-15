//revise when better understanding of DOM is established
var showMoreSignature = ['ThreadedConversation-moreRepliesLink', 'ThreadedConversation-showMoreThreadsButton' ,'show-more-link', 'new-tweets-bar'];
for(var i = 0; i<showMoreSignature.length; i++)
{
	for( var j = 0; j<2; j++ )
	{

		var showMore;
		if( j == 0 )
		{
			showMore = document.querySelectorAll( '[class="' + showMoreSignature[i] + '"]' );
		}
		else
		{
			showMore = document.getElementsByClassName( showMoreSignature[i] );
		}

		for(var k=0; k<showMore.length; k++)
		{
			showMore[k].click();
		}

	}
}