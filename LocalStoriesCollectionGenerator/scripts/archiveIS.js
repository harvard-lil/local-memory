
clickSubmit();

function clickSubmit()
{
	//click submit then get location
	var inputs = document.getElementsByTagName('input');
	for(var i=0; i<inputs.length; i++)
	{
		if( inputs[i].getAttribute('type').trim().toLowerCase() === 'submit' && inputs[i].getAttribute('value').trim().toLowerCase().indexOf('save') !== -1 )
		{
			inputs[i].click();
			break;
		}
	}
}