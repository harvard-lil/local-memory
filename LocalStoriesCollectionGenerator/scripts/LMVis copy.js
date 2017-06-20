
var globalBaseURI = 'http://www.localmemory.org/';
var globalDebugFlag = false;
var globalEmbedCardClassName = 'embedlyCard'; //default: 'emded-card';
var globalNewsCollectionCount = -1;

var globalPayload = [];
var globalMaxPagesToVisit = 1;

var globalNewsCollection = {};
var globalNewsCollectionIndexer = 0;

//globalEditedCollection used by archiving method and save method, globalNewsCollection is canonical collection
var globalEditedCollectionCount = 0;
var globalEditedCollection = {};

//{tabid, tab}
var globalCurTabIDsDict = {};
/*
globalEditingFlag is true 
    1. when user is adding new website to collection
*/
var globalEditingFlag = false;
//used in uri naming scheme
var globalUniqueUserID = '';
var globalPvtID = '';

//globalMaxTabReadyCount: maximum times tab is checked before notifying incident
var globalMaxTabReadyCount = 5;
//globalTabReadyCount used to notify user when captcha might have occured (spinning until expected uri is captcha behaviour)
var globalTabReadyCount = 0;

/*
globalStopFlag used to stop search/archive, must be set to false after use
*/
var globalStopFlag = false;

/*Keeps track of app state such as saved*/
var globalAppState = {};

document.addEventListener('DOMContentLoaded', function()
{
    main();
});


chrome.tabs.onUpdated.addListener(function(tabid, info, tab)
{
    globalCurTabIDsDict[tabid] = tab;
});

function main()
{
    /*
        dataReceived, globalNewsCollection format:
        {
            'timestamp': '',
            'query': '',
            'zipcode': '',
            'maximumLinksPerSource': '',
            'collection': 
            [
                {
                    'source':
                    {
                        'cityCountyName': '',
                        'name': '',
                        'website': '',
                        'state': '',
                        'country': '',
                        'miles': '',
                        'type': Newspaper - college or Newspaper - cityCounty or TV,
                        'cityCountyNameLat': float,
                        'cityCountyNameLong': float,
                        'Facebook': '',
                        'Twitter': '',
                        'Video': ''
                    }
                    'links': <== added by openURITab()
                    [ 
                        {link: crawlDatetime or nowDatetime, 'title': '', 'crawlDatetime': '', 'snippet': ''},
                        {link: crawlDatetime or nowDatetime, 'title': '', 'crawlDatetime': '', 'snippet': ''},
                        ...
                    ]
                }
                ...
            ]
        }

        globalPayload:
        for single google query
        {
            0: [
                    {link: '', crawlDatetime: '', 'snippet': '',  title: ''},
                    {},
                ],
            1: [],
            ...
        }
    */
    //
    console.log('');
    console.log('main():');
    console.log('\tglobalDebugFlag: ', globalDebugFlag);

    if( globalDebugFlag == false )
    {
        window.onbeforeunload = function() { return ''; };
    }
    
    //config - start
    chrome.storage.sync.get('userID', function(items) 
    {
        if (items.userID !== undefined) 
        {
            globalUniqueUserID = items.userID;
        }
        console.log('\tglobalUniqueUserID: ', globalUniqueUserID);
    });

    chrome.storage.sync.get('pvtID', function(items) 
    {
        globalPvtID = items.pvtID;
        if (globalPvtID === undefined) 
        {
            globalPvtID = getRandomToken(100);
            chrome.storage.sync.set({pvtID: globalPvtID}, function()
            {
              console.log('\tsaved pvtID: ', globalPvtID);  
            });
        }
        console.log('\tglobalPvtID: ', globalPvtID);
    });
    //config - end

    var advBtn = document.getElementById("advBtn");
    advBtn.onclick = function()
    {
        if (document.getElementById('advMenu').style.display === 'none')
        {
            document.getElementById('advMenu').style.display = 'block';
            advBtn.innerHTML = 'ᐃ';

            if (globalNewsCollection.query)
            {
                document.getElementById('newColDownloadFilename').value = globalNewsCollection.query;
                document.getElementById('setColName').value = globalNewsCollection.query;
            }
        }
        else
        {
            document.getElementById('advMenu').style.display = 'none';
            advBtn.innerHTML = 'ᐁ';
        }
    };

    //link input to enter key - start
    var idsToLinkToEnterKey = ['query', 'zipcode', 'sourceCount'];
    for (var i = 0; i < idsToLinkToEnterKey.length; i++)
    {
        var tag = document.getElementById(idsToLinkToEnterKey[i])
            .addEventListener("keyup", function(event)
            {
                event.preventDefault();
                if (event.keyCode == 13)
                {
                    if( !globalDebugFlag )
                    {
                        submitButtonClick();
                    }
                }
            });
    }
    //link input to enter key - end


    //init countries list - start
    if( !globalDebugFlag )
    {
        httpGet
        (
            globalBaseURI + 'api/countries/',
            function(dataReceived)
            {
                console.log('\tmain(): dataReceived');
                var countriesList = document.getElementById('country');
                //position 0 is USA
                for (var i = 1; i < dataReceived.length; i++)
                {
                    var option = document.createElement('option');
                    option.value = dataReceived[i];
                    option.text = dataReceived[i];
                    countriesList.appendChild(option);
                }
            },
            function(errorMessage)
            {
                console.log('\tError countries list: ' + errorMessage);
            }
        );
    }
    else
    {
        console.log('\tINIT countries list OFF');
    }
    //init countries list - end

    document.getElementById('submitButton').onclick = function()
    {
        if( !globalDebugFlag )
        {
            submitButtonClick();
        }
    };

    document.getElementById('newColPlus').onclick = function()
    {
        userAddCollectionInputClick();
    };

    document.getElementById('newColAddButton').onclick = function()
    {
        userAddCollectionClick();
    };

    document.getElementById('colDownloadButton').onclick = function()
    {
        downloadColfileClick();
    };

    document.getElementById('submitMediaClick').onclick = function()
    {
        this.style.color = '#43007A';
        createAlertMessageBoard('alert info', 'To add a news media source please email: "anwala@cs.odu.edu" with subject: "LMP-Add", <br>to report an error, please use subject: "LMP-Error"');
    };

    document.getElementById('archiveButton').onclick = function()
    {
        //document.getElementById('advBtn').click();
        if( globalNewsCollection.query )
        {
            solicitSettingGlobalUniqueUserID('archiveIS');
        }
    };

    document.getElementById('saveRemotelyButton').onclick = function()
    {
        if (globalNewsCollection.query)
        {
            solicitSettingGlobalUniqueUserID();
        }
    };

    document.getElementById('setColNameButton').onclick = function()
    {
        if (globalNewsCollection.query)
        {
            var colName = document.getElementById('setColName').value;
            colName = colName.trim();
            colName = removeHTMLFromStr(colName);

            if( colName.length != 0 )
            {
                console.log('\tsetColNameButton, colName:', colName);
                globalNewsCollection.collectionName = colName;
            }
        }
    };

    document.getElementById('newColFile').addEventListener('change', uploadNewColfile, false);
    document.getElementById('showCardsChkbox').addEventListener('change', toggleCards, false);
    
    if( globalDebugFlag == false )
    {
        mapIPToZip();
    }

    if( globalDebugFlag )
    {
       document.getElementById('showCardsChkbox').checked = false; 
    }

}

//iso8601DateStr: '2016-09-17T17:38:00Z'
function specialDateFormat(iso8601DateStr)
{
    var weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var datetime = new Date(iso8601DateStr);
    var timezone = datetime + '';
    timezone = '(' + timezone.split(' (')[1];

    var hours = datetime.getHours();
    var suffix = (hours >= 12)? 'PM' : 'AM';
    hours = ((hours + 11) % 12 + 1);

    var minutes = datetime.getMinutes() + '';
    if( minutes.length == 1 )
    {
        minutes = '0' + minutes;
    }

    return weekday[datetime.getDay()] + ', ' + 
    monthNames[datetime.getMonth()] + ' ' + 
    datetime.getDate() + ', ' + datetime.getFullYear() + ', ' + 
    hours + ':' + minutes + ' ' +  suffix + ' ' + timezone;
}

function getDatestamp_obsolete()
{
    var datestamp = new Date();
    var yyyy, MM, dd, hh, mm, ss;

    yyyy = datestamp.getFullYear();
    MM = (datestamp.getMonth()+1) + '';
    
    if( MM.length == 1 )
    {
        MM = '0' + MM;
    }

    dd = datestamp.getDate() + '';
    if( dd.length == 1 )
    {
        dd = '0' + dd;
    }

    hh = datestamp.getHours() + '';
    if( hh.length == 1 )
    {
        hh = '0' + hh;
    }

    mm = datestamp.getMinutes() + '';
    if( mm.length == 1 )
    {
        mm = '0' + mm;
    }

    ss = datestamp.getSeconds() + '';
    if( ss.length == 1 )
    {
        ss = '0' + ss;
    }

    //datestamp =  yyyy + MM + dd + hh + mm + ss; this leads to unstable uri
    datestamp =  yyyy + MM + dd;
    return datestamp;
}

function solicitSettingGlobalUniqueUserID(sender, msg)
{
    //set globalUniqueUserID to authorNameInput
    
    if( sender == undefined )
    {
        sender = '';
    }

    if( msg == undefined )
    {
        msg = '';
    }

    var parentDiv = document.createElement('div');
    parentDiv.className = 'pure-form pure-form-stacked';

    var msgSpan = document.createElement('span');
    msgSpan.id = 'authorSetResponseMsg';
    msgSpan.style = 'color: red;';
    msgSpan.innerHTML = msg;
    var fieldSet = document.createElement('fieldset');

    var pureGDiv = document.createElement('div');
    pureGDiv.className = 'pure-g';
    pureGDiv.title = 'Only numbers and letters and spaces allowed.';


    //authorNameInput - start
    var authorNameInputContainer = document.createElement('div');
    authorNameInputContainer.className = 'pure-u-1 pure-u-md-1-2';

    var authorNameInputLabel = document.createElement('label');
    authorNameInputLabel.innerHTML = 'Author (*)';
    var authorNameInput = document.createElement('input');
    authorNameInput.className = 'pure-u-23-24';
    authorNameInput.id = 'authorNameInput';
    authorNameInput.value = globalUniqueUserID;
    authorNameInput.setAttribute('maxlength', '20');
    authorNameInput.required = true;

    authorNameInputContainer.appendChild(authorNameInputLabel);
    authorNameInputContainer.appendChild(authorNameInput);
    //authorNameInput - end

    //collectionNameInput - start
    var collectionNameInputContainer = document.createElement('div');
    collectionNameInputContainer.className = 'pure-u-1 pure-u-md-1-2';

    var collectionNameInputLabel = document.createElement('label');
    collectionNameInputLabel.innerHTML = 'Collection name';
    var collectionNameInput = document.createElement('input');
    collectionNameInput.className = 'pure-u-23-24';
    collectionNameInput.id = 'collectionNameInput';
    if( globalNewsCollection.collectionName )
    {
        collectionNameInput.value = globalNewsCollection.collectionName;
    }
    collectionNameInput.setAttribute('sender', sender);

    collectionNameInputContainer.appendChild(collectionNameInputLabel);
    collectionNameInputContainer.appendChild(collectionNameInput);
    //collectionNameInput - end

    //set - start
    var setCustColnameInput = document.createElement('input');
    setCustColnameInput.className = 'pure-button pure-button-primary';
    setCustColnameInput.value = 'Save';
    setCustColnameInput.type = 'submit';

    setCustColnameInput.onclick = function()
    {
        console.log('\nsolicitSettingGlobalUniqueUserID():');
        
        var collectionNameInput = document.getElementById('collectionNameInput');
        var sender = collectionNameInput.getAttribute('sender');
        console.log('\tsender:', sender);

        collectionNameInput = removeHTMLFromStr(collectionNameInput.value);
        globalNewsCollection.collectionName = collectionNameInput;

        if( globalUniqueUserID.length != 0 )
        {
            console.log('\texisting user');
            //existing user
            if( sender == 'archiveIS' )
            {
                saveRemotely(archiveIS);
            }
            else
            {
                saveRemotely(saveRemoteGenericResponseHandler);
            }

            document.getElementById("myModalClose").click();
        }
        else
        {
            //new user, get author name
            console.log('\tnew user');

            var authorNameInput = document.getElementById('authorNameInput').value;
            authorNameInput = removeHTMLFromStr(authorNameInput);
            authorNameInput = slugify(authorNameInput, '');

            if( authorNameInput.length == 0 )
            {
                document.getElementById('authorSetResponseMsg').innerHTML = 'Please set author name.';
                return;
            }

            document.getElementById('authorSetResponseMsg').innerHTML = 'Checking if name author name exist, please wait...';
            httpGet
            (
                globalBaseURI + 'authors/' + authorNameInput + '/',
                function(dataReceived)
                {
                    document.getElementById('authorSetResponseMsg').innerHTML = '';
                    console.log('\tdataReceived:', dataReceived);
                    if( dataReceived.msg == 'True' )
                    {
                        document.getElementById('authorSetResponseMsg').innerHTML = authorNameInput + ' is not available, please choose another name.';
                    }
                    else if( dataReceived.msg == 'False' )
                    {
                        //here means authorNameInput is good, so set globalUniqueUserID - start
                        globalUniqueUserID = authorNameInput;
                        chrome.storage.sync.set({userID: authorNameInput}, function()
                        {
                          console.log('\tsave user id: ', authorNameInput);  
                        });
                        //here means authorNameInput is good, so set globalUniqueUserID - end
                        
                        if( sender == 'archiveIS' )
                        {
                            saveRemotely(archiveIS);
                        }
                        else
                        {
                            saveRemotely(saveRemoteGenericResponseHandler);
                        }
                        document.getElementById("myModalClose").click();
                    }
                    else
                    {
                        document.getElementById('authorSetResponseMsg').innerHTML = 'Sorry, an error occured on the server. Please try again later.';
                    }
                },
                function(errorMessage)
                {
                    console.log('\terror saving:', errorMessage);
                    document.getElementById('authorSetResponseMsg').innerHTML = 'Sorry, an error occured on the client. Please try again later.';
                }
            );
        }
    };
    //set - end
    
    pureGDiv.appendChild(authorNameInputContainer);
    pureGDiv.appendChild(collectionNameInputContainer);
    pureGDiv.appendChild(setCustColnameInput);
    fieldSet.appendChild(pureGDiv);
    parentDiv.appendChild(msgSpan);
    parentDiv.appendChild(fieldSet);

    modal('Set Collection Author Name', parentDiv, '40%');
}

//credit: http://www.w3schools.com/howto/howto_css_modals.asp
function modal(modalTitle, bodyContentDiv, modalWidth)
{
    console.log('\nmodal():');
    if( modalTitle == undefined )
    {
        modalTitle = '';
    }

    if( modalWidth == undefined )
    {
        modalWidth = '80%';
    }
    
    var modal = document.getElementById('myModal');
    var closeSpan = document.getElementById("myModalClose");
    document.getElementById('modalTitle').innerHTML = modalTitle;

    document.getElementsByClassName("modal-body")[0].innerHTML = '';
    document.getElementsByClassName("modal-body")[0].appendChild(bodyContentDiv);
    document.getElementsByClassName("modal-content")[0].style.width = modalWidth;

    modal.style.display = "block";
    
    closeSpan.onclick = function()
    {
        modal.style.display = "none";
    };

    window.onclick = function(event)
    {
        if (event.target == modal)
        {
            modal.style.display = "none";
        }
    }
}

function twitterButton()
{
    console.log('');
    console.log('twitterButton():');

    var tweetInLink = '';
    if( globalNewsCollection.collection )
    {
       if( globalNewsCollection.collection.length != 0 )
       {
            //var archivedLink = encodeURIComponent(archiveISGetCollectionArchivedURL());
            //new schema
            var savedLink = encodeURIComponent(getRemoteSavedURI());
            var firstLink = '';

            for(var i=0; i<globalNewsCollection.collection.length; i++)
            {
                for(var j=0; j<globalNewsCollection.collection[i].links.length; j++)
                {
                    if( globalNewsCollection.collection[i].links[j].link )
                    {
                        firstLink = globalNewsCollection.collection[i].links[j].link;
                        break;
                    }
                }

                if( firstLink.length != 0 )
                {
                    break;
                }
            }

            /*
            tweetInLink = 'https://twitter.com/intent/tweet?text=.%40localmem%20my%20collection%20%22' + 
            encodeURIComponent(globalNewsCollection.query) + '%22:%20' + savedLink + '%20' + 
            encodeURIComponent(firstLink) + '&hashtags=localmemory';
            */

            tweetInLink = 'https://twitter.com/intent/tweet?text=.%40localmem%20my%20collection%20%22' + 
            encodeURIComponent(globalNewsCollection.query) + 
            '%22' + encodeURIComponent(', ' + globalNewsCollection.city + 
            ', ' + globalNewsCollection.state) + ':%20' + savedLink + '%20' + 
            encodeURIComponent(firstLink) +'&hashtags=localmemory';
       }
    }

    if( tweetInLink.length == 0 )
    {
        tweetInLink = 'https://twitter.com/intent/tweet?text=I love local memory&hashtags=localmemory';
        tweetInLink = encodeURI(tweetInLink);
    }
    
    var container = document.getElementById('tweetShareContainer');
    container.innerHTML = '';
    
    //make <a class="twitter-share-button" id="tweetLink" data-size="large" href=""></a>
    var tweetShareButton = document.createElement('a');
    tweetShareButton.className = 'twitter-share-button';
    tweetShareButton.href = tweetInLink;
    tweetShareButton.setAttribute('data-size', 'large');

    container.appendChild(tweetShareButton);

    window.twttr = (function(d, s, id)
    {
        var js, fjs = d.getElementsByTagName(s)[0],
            t = window.twttr ||
            {};

        js = d.createElement(s);
        js.id = id;
        js.src = "https://platform.twitter.com/widgets.js";
        fjs.parentNode.insertBefore(js, fjs);

        t._e = [];
        t.ready = function(f)
        {

            t._e.push(f);
        };

        t.ready(function (t) 
        {
          t.events.bind('tweet', function(event) 
          {
            if( globalAppState.savedRemotelyFlag != true )
            {
                solicitSettingGlobalUniqueUserID('', 'Please save so the collection you shared would be available.');
            }

          });

        });

        return t;
    }(document, "script", "twitter-wjs"));
}

function mapIPToZip()
{
    httpGet
        (
            globalBaseURI + 'api/ip/',
            function(dataReceived)
            {
                console.log('\tmapIPToZip(): IP dataReceived');
                var requestURI = 'https://freegeoip.net/json/' + dataReceived['ip'];

                httpGet
                    (
                        requestURI,
                        function(dataReceived)
                        {
                            console.log('\tmapIPToZip(): zipcode dataReceived');
                            console.log('\t', dataReceived);

                            dataReceived.zip_code = dataReceived.zip_code.trim();
                            if (isNaN(dataReceived.zip_code) === false && document.getElementById('zipcode').value.trim().length == 0)
                            {
                                /*
                                globalGeoParameters.city = dataReceived.city.trim();
                                globalGeoParameters.region_name = dataReceived.region_name.trim();
                                globalGeoParameters.country_name = dataReceived.country_name.trim();
                                */
                                document.getElementById('zipcode').value = dataReceived.zip_code;
                            }
                        },
                        function(errorMessage)
                        {
                            console.log('\tmapIPToZip(): zipcode: ' + errorMessage);
                        }
                    );

            },
            function(errorMessage)
            {
                console.log('\tmapIPToZip(): Error: ' + errorMessage);
            }
        );
    //freegeoip.net/{format}/{IP_or_hostname}
    //http://freegeoip.net/?q=140.247.0.128
    //http://www.geoplugin.com/: 120/min
    //http://ip-api.com/docs/: 150/min
    //https://ipapi.co/#api: 1000/day
}

function getRandomToken(k)
{
    if(k === undefined || k < 1 )
    {
        k = 20;
    }
    var randToken = '';
    var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    for(var i=0; i<k; i++)
    {
        //rand beteen 0 and k inclusive
        var randIndex = Math.floor(Math.random() * alphabet.length);
        var token = alphabet[randIndex];

        //coin toss
        if( Math.floor((Math.random() * 2)) == 0 )
        {
            token = token.toLowerCase();
        }

        randToken += token;
    }

    return randToken;
}


function removeNonAlpha_obsolete(str)
{
    if( str === undefined )
    {
        return '';
    }

    var letterNumber = /^[0-9a-zA-Z]+$/;
    var result = '';
    for(var i=0; i<str.length; i++)
    {
        if( str[i].match(letterNumber) )
        {
            result = result + str[i];
        }
    }

    return result;
}

//credit: https://gist.github.com/mathewbyrne/1280286
function slugify(text, lowerCaseOffFlag)
{   
    text = text.toString();

    if( lowerCaseOffFlag == undefined )
    {
        text = text.toLowerCase();
    }
    
    return text.replace(/\s+/g, '-')    // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function getRequestID(country, zipcode, query, sourceCount)
{
    if( country === undefined )
    {
        country = '';
    }

    if( zipcode === undefined )
    {
        zipcode = '';
    }

    if( query === undefined )
    {
        query = '';
    }

    if( sourceCount === undefined )
    {
        sourceCount = '';
    }
    sourceCount = sourceCount + '';

    country = country.substr(0, 50);
    zipcode = zipcode.substr(0, 6);
    query = query.substr(0, 100);
    sourceCount = sourceCount.substr(0, 3);

    return slugify(country + ' ' + zipcode + ' ' + query + ' ' + sourceCount);
}

//google backbone - start
function submitButtonClick()
{
    var country = document.getElementById('country').value;
    var query = document.getElementById('query').value.trim();
    var zipcode = document.getElementById('zipcode').value.trim();
    var sourceCount = document.getElementById('sourceCount').value;

    console.log('');
    console.log('submitButtonClick():');
    console.log('\tcountry: ', country);
    console.log('\tquery: ', query);
    console.log('\tzipcode: ', zipcode);
    console.log('\tsourceCount: ', sourceCount);
    console.log('\tAdvanced Options - ');

    var maximumPages = document.getElementById('maximumPages').value;

    if (maximumPages < 1)
    {
        maximumPages = 1;
    }
    else if (maximumPages > 10)
    {
        maximumPages = 10;
    }
    globalMaxPagesToVisit = maximumPages;

    console.log('\tmaximumPages: ', maximumPages);

    if (query.length == 0)
    {
        alert('Please enter a valid query.');
        return;
    }

    if (zipcode.length == 0)
    {
        alert('Please enter a valid zipcode.');
        return;
    }

    if (sourceCount < 1)
    {
        alert('Please enter a valid source count.');
        return;
    }

    createAlertMessageBoard('alert warning', '...please wait');

    httpGet
        (
            globalBaseURI + 'api/' + country + '/' + zipcode + '/' + sourceCount + '?off=radio',
            function(dataReceived)
            {
                console.log('\tsubmitButtonClick(): dataReceived');

                //uniform representation - start
                dataReceived.query = query;
                dataReceived.zipcode = zipcode;
                dataReceived.maximumLinksPerSource = sourceCount;

                dataReceived['self_lmg'] = dataReceived.self;
                delete dataReceived.self;

                for(var i=0; i<dataReceived.collection.length; i++)
                {
                    dataReceived.collection[i] = {source: dataReceived.collection[i], links: []};
                }
                //uniform representation - end

                //reset state - start
                console.log('\tsubmitButtonClick(): reset globalAppState');
                globalAppState = {};
                //reset state - end

                document.getElementById('alertCloseButton').click();
                if (dataReceived.collection.length != 0)
                {
                    createAlertMessageBoard('alert warning', '...searching, please do not close search tab');
                    document.getElementById('submitButton').disabled = true;
                }
                else
                {
                    createAlertMessageBoard('alert info', 'No results.');
                    setTimeout(function()
                    {
                        document.getElementById('alertCloseButton').click();
                    }, 2000);
                }

                globalNewsCollection = dataReceived;
                googleGetSERPResults();
            },
            function(errorMessage)
            {
                console.log('\tError: ' + errorMessage);
            }
        );
}

function googleGetSERPResults()
{
    console.log('');
    console.log('googleGetSERPResults():');

    if( globalNewsCollection.collection === undefined )
    {
        console.log('\tundefined collection');
        return;
    }

    if (globalNewsCollection.collection.length == 0)
    {
        console.log('\tempty collection');
        return;
    }

    console.log('\tquery:', globalNewsCollection.query);
    var domain = globalNewsCollection.collection[0].source.website;
    domain = getDomain(domain);

    var uri = googleGetSearchURI(globalNewsCollection.query + ' site:' + domain, 1);
    console.log('\turi: ', uri);

    var delay = document.getElementById('googleDelay').value;
    if(delay < 2 || delay > 60 )
    {
        delay = 2;
    }
    delay = delay * 1000;


    chrome.tabs.query({'active': true}, function(parentTabs)
    {
        if( parentTabs.length != 0 )
        {
            chrome.tabs.create(
            {
                'url': uri,
                'index': parentTabs[0].index + 1,
                'active': false
            },
            function(childTab)
            {
                //update tab state just in case state changed after creation, e.g., google capture, so wait a little (captcha detection helper) - start
                console.log('\tsleep: ', delay);
                setTimeout(function()
                {
                    chrome.tabs.get(childTab.id, function(tab)
                    { 
                        console.log('\tcreated taburl/status/id: ', tab.url, tab.status, tab.id);
                        //early update of tab state before chrome.tabs.onUpdated() called
                        globalCurTabIDsDict[tab.id] = tab;
                        processHTMLForTab(tab, uri, 1);
                    });
                }, delay);
                //update tab state just in case state changed after creation, e.g., google capture, so wait a little (captcha detection helper) - end

            });
        }
    });
}

function openURITab(tab, query, page)
{
    var uri = googleGetSearchURI(query, page);

    console.log('');
    console.log('openURITab():');
    console.log('\tpage: ', page, ' of ', globalMaxPagesToVisit);

    var delay = document.getElementById('googleDelay').value;
    if(delay < 2 || delay > 60 )
    {
        delay = 2;
    }

    delay = delay * 1000;

    chrome.tabs.update(tab.id, {url: uri}, function(updatedTab)
    {
        console.log('\tloaded taburl/status/id: ', updatedTab.url, updatedTab.status, updatedTab.id);
        console.log('\tloaded tab expected: ', uri);
        console.log('\tsleep: ', delay);
        
        //update tab state just in case state changed after updating, e.g., google capture, so wait a little - start
        setTimeout(function()
        {
            chrome.tabs.get(updatedTab.id, function(tab)
            {
                //early update of tab state before chrome.tabs.onUpdated() called
                globalCurTabIDsDict[tab.id] = tab;

                console.log('\tupdate loaded tab current uri/status/id: ', tab.url, tab.status, tab.id);
                processHTMLForTab(tab, uri, page);
            });
        }, delay);
        //update tab state just in case state changed after updating, e.g., google capture, so wait a little - end
        
    });
}

function isTabReady(tab, expectedTabURI)
{
    console.log('isTabReady():');
    console.log('\tglobalCurTabIDsDict: ', globalCurTabIDsDict);

    //ensure tab is completely loaded before running script - start
    //note that tab information is not fresh, so any result update is not seen by tab, but globalCurTabIDsDict is fresh
    
    if( globalCurTabIDsDict[tab.id] )
    {
        if( globalCurTabIDsDict[tab.id].status != "complete" )
        {
            console.log('\ttab NOT loaded');
            return false;
        }
    }
    else
    {
        console.log('\ttab NOT in dict: ', tab.id);
        return false;
    }
    //ensure tab is completely loaded before running script - end

    if( expectedTabURI !== undefined )
    {
        //check if tab is expected tab - start
        console.log('\tcurrent tab.url/id: ', globalCurTabIDsDict[tab.id].url, tab.id);
        console.log('\texpected tab.url: ', expectedTabURI);

        if( expectedTabURI.indexOf('https://www.google.com/') == 0 )
        {
            //special code for google domain - start
            //this is a sample captcha uri: https://ipv4.google.com/sorry/IndexRedirect?continue=https://www.google.com/search%3Fq%3Dny%2Bweather%26bav%3Don.2,or.%26cad%3Db%26biw%3D1000%26bih%3D600%26dpr%3D1%26ech%3D1%26psi%3DrZvAV-6ME-Xw6AShobqYAw.1472240560900.3%26ei%3DrZvAV-6ME-Xw6AShobqYAw%26emsg%3DNCSR%26noj%3D1&q=CGMSBKL3SNgYtLeCvgUiGQDxp4NLe393I0v93BAmCHYWTzkrq2qqML8
            if( globalCurTabIDsDict[tab.id].url.indexOf('https://www.google.com/') != 0 )
            {
                console.log('\twww.google.com not prefix; captcha possible');
                return false;
            }
            //special code for google domain - end
        }
        else
        {
            if( expectedTabURI.indexOf(globalCurTabIDsDict[tab.id].url) == -1 )
            {
                console.log('\ttab MISMATCH');
                return false;
            }
        }
        //check if tab is expected tab - end
    }
    
    console.log('\ttab ready');
    return true;
}

//responsible for populating globalPayload
function processHTMLForTab(tab, expectedTabURI, page)
{
    console.log('');
    console.log('processHTMLForTab():');
    console.log('\tglobalTabReadyCount: ', globalTabReadyCount);

    if( globalTabReadyCount > 100 )
    {
        globalTabReadyCount = globalMaxTabReadyCount + 1;
    }

    if( globalTabReadyCount > globalMaxTabReadyCount )
    {
        document.getElementById('alertCloseButton').click();
        createAlertMessageBoard('alert', 'Attention required: Please check the search tab. Refresh and/or solve captcha.');
    }
    
    if( isTabReady(tab, expectedTabURI) == false )
    {
        globalTabReadyCount++;
        setTimeout(function()
        {
            processHTMLForTab(tab, expectedTabURI, page);
        }, 1000);
        
        return;
    }
    

    //update tab
    globalTabReadyCount = 0;
    tab = globalCurTabIDsDict[tab.id];

    chrome.tabs.executeScript(tab.id,
    {
        file: "./scripts/getGoogleLinksDict.js"
        /*code: codeToExecute*/
    }, function(result)
    {
        console.log('\tprocessHTMLForTab(), executeScript():');
        console.log('\tdone tab:', tab.url);
        console.log('\tdone page:', page);

        //injecting into an extensions page or the webstore/NTP = error
        if (chrome.runtime.lastError)
        {
            console.log('\t', chrome.runtime.lastError.message);
        }

        /*
            result format:
            [0](artifact of runtime){
                'link': {'title': '', 'crawlDatetime': '', 'snippet': ''...}
                ...
            }
        */
        if (result.length != 0)
        {
            //Object.keys(result[0])
            //directive?: check for duplicate page based on previous entry before adding
            if (page == 1)
            {
                globalPayload[0] = getListOfDict(result[0]);
            }
            else
            {
                //merge with previous
                globalPayload[0] = globalPayload[0].concat(getListOfDict(result[0]));
            }
        }

        if (page == globalMaxPagesToVisit)
        {
            //for this source all pages have been visited
            if (globalPayload.length != 0)
            {
                globalNewsCollection.collection[globalNewsCollectionIndexer].links = globalPayload[0];
            }

            setTimeout(function()
            {
                serveGlobalNewsPayload(tab);
            }, 1000);
        }
        else
        {
            //for this source all pages have NOT been visited
            var domain = globalNewsCollection.collection[globalNewsCollectionIndexer].source.website;
            domain = getDomain(domain);
            openURITab(tab, globalNewsCollection.query + ' site:' + domain, page + 1);
        }

    });
}

function serveGlobalNewsPayload(tab)
{
    console.log('');
    console.log('serveGlobalNewsPayload():');
    //here means 1 source already done
    console.log('\tgloIndexer: ', globalNewsCollectionIndexer, 'of', globalNewsCollection.collection.length);
    globalNewsCollectionIndexer++;

    
    if( globalStopFlag || globalNewsCollectionIndexer >= globalNewsCollection.collection.length )
    {
        //stop search - start
        //reset
        globalNewsCollectionIndexer = 0;
        globalPayload = [];
        document.getElementById('alertCloseButton').click();
        document.getElementById('submitButton').disabled = false;

        if( globalStopFlag )
        {
            //search was terminated by user
            console.log('\tsearch aborted by user');
            globalStopFlag = false;
        }
        
        console.log('\t', globalNewsCollection);
        drawGrid(globalNewsCollection);

        setTimeout(function()
        {
            chrome.tabs.remove(tab.id, null);
        }, 5000);
        
        //stop search - end
    }
    else
    {
        var domain = globalNewsCollection.collection[globalNewsCollectionIndexer].source.website;
        domain = getDomain(domain);

        //progress - start
        document.getElementById('alertCloseButton').click();
        createAlertMessageBoard('alert warning', '...searching ' + 
            (globalNewsCollectionIndexer + 1) + 
            ' of ' + globalNewsCollection.collection.length + 
            ', please don\'t close search tab. Searching ' + domain
        );
        //progress - end

        openURITab(tab, globalNewsCollection.query + ' site:' + domain, 1);
    }
}
//google backbone - end

//user custom collection interaction - start
function userAddCollectionInputClick()
{
    console.log('');
    console.log('userAddCollectionInputClick():');

    var typesDescription = [
        ['url', 'URL'],
        ['text', 'Title'],
        ['text', 'Snippet'],
        ['date', 'Date']
    ];

    var newCollectionMenu = document.getElementById('newCollectionMenu');
    var divClassName = 'pure-u-1 pure-u-md-1-4';
    var inputName = 'pure-u-23-24';

    for (var i = 0; i < typesDescription.length; i++)
    {
        var type = typesDescription[i][0];
        var description = typesDescription[i][1];

        var urlDiv = document.createElement('div');
        urlDiv.className = divClassName;

        var urlLabel = document.createElement('label');
        urlLabel.innerHTML = description;

        var newColUrl = document.createElement('input');
        newColUrl.id = 'newCol' + description;
        newColUrl.className = inputName + ' newCol' + description;
        newColUrl.type = type;
        if (description == 'URL')
        {
            newColUrl.value = 'http://';
        }
        newColUrl.required = true;

        urlDiv.appendChild(urlLabel);
        urlDiv.appendChild(newColUrl);
        newCollectionMenu.appendChild(urlDiv);
    }
}

function userAddCollectionClick()
{
    console.log('');
    console.log('userAddCollectionClick():');
    var urls = document.getElementsByClassName('newColURL');
    var titles = document.getElementsByClassName('newColTitle');
    var snippets = document.getElementsByClassName('newColSnippet');
    var dates = document.getElementsByClassName('newColDate');

    var links = [];
    for (var i = 0; i < urls.length; i++)
    {
        var link = urls[i].value;
        var title = titles[i].value;
        var crawlDatetime = dates[i].value;
        var snippet = snippets[i].value;

        if (isValidUrl(link) === false)
        {
            continue;
        }

        if (isNaN(Date.parse(crawlDatetime)))
        {
            crawlDatetime = '';
        }

        var tempObj = {
            link: link,
            title: removeHTMLFromStr(title),
            snippet: removeHTMLFromStr(snippet),
            crawlDatetime: crawlDatetime
        };

        links.push(tempObj);
    }

    if( !globalNewsCollection.collection )
    {
        createAlertMessageBoard('alert', 'Cannot add to empty collection');
        return;
    }

    if (globalNewsCollection.collection.length != 0 && links.length != 0)
    {
        var tempObjSource = {
            Facebook: '',
            Twitter: '',
            Video: '',
            cityCountyName: '',
            cityCountyNameLat: 0,
            cityCountyNameLong: 0,
            country: '',
            miles: '',
            name: '',
            state: '',
            type: '',
            website: ''
        };

        if (globalNewsCollection.collection[0].source.type.length == 0)
        {
            globalNewsCollection.collection[0] = {
                links: globalNewsCollection.collection[0].links.concat(links),
                source: tempObjSource
            };
        }
        else
        {
            //first time user is contributing
            globalNewsCollection.collection.unshift(
            {
                links: links,
                source: tempObjSource
            });
        }

        document.getElementById('showCardsChkbox').checked = false;
        globalEditingFlag = true;
        createAlertMessageBoard('alert info', 'Cards switched off during edit. Goto ᐁ and check "Show cards" when done editing.');

        drawGrid(globalNewsCollection);
    }
}

function downloadColfileClick()
{
    console.log('');
    console.log('downloadColfileClick():');

    if (!globalNewsCollection.collection)
    {
        return;
    }

    //check if user has excluded some links
    editGlobalNewsCollection();
    if( !globalEditedCollection.collection )
    {
        return;
    }

    var typeDict = {json: 'application/json', txt: 'text/plain'};
    var downloadType = document.getElementById('downloadType').value;

    console.log('\ttype: ', downloadType);
    console.log('\tdownloadType: ', typeDict[downloadType]);

    var blob;
    if( downloadType == 'json' )
    {
        blob = new Blob([JSON.stringify(globalEditedCollection, null, 2)],
        {
            type: typeDict[downloadType]
        });
    }
    else if( downloadType == 'txt' )
    {
        var plaintext = '';
        for(var i=0; i<globalEditedCollection.collection.length; i++)
        {
            var sourceLinksDict = globalEditedCollection.collection[i];
            for(var j=0; j<sourceLinksDict.links.length; j++)
            {
                plaintext = sourceLinksDict.links[j].link + '\n' + plaintext;
            }
        }

        blob = new Blob([plaintext],
        {
            type: typeDict[downloadType]
        });
    }
    else
    {
        return;
    }

    var url = window.URL.createObjectURL(blob);
    var outfilename = document.getElementById('newColDownloadFilename').value.trim();
    if (outfilename.length == 0)
    {
        outfilename = globalNewsCollection.query;
        document.getElementById('newColDownloadFilename').value = outfilename;
    }

    outfilename = outfilename + '_LMP.' + downloadType;

    var aTag = document.createElement('a');
    aTag.download = removeHTMLFromStr(outfilename);
    aTag.href = url;
    aTag.style.display = 'none';
    aTag.click();

    document.getElementById('advBtn').click();
}

function uploadNewColfile(evt)
{
    //credit to: http://www.html5rocks.com/en/tutorials/file/dndfiles/

    var files = evt.target.files;

    if( files.length == 0 )
    {
        return;
    }

    f = files[0];
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile)
    {
        return function(data)
        {
            //document.getElementById("advBtn").click();
            globalNewsCollection = JSON.parse(data.target.result);
            globalEditingFlag = false;
            var advBtn = document.getElementById("advBtn").click();
        
            drawGrid(globalNewsCollection);
        };
    })(f);

    reader.readAsText(f);
}

//user custom collection interaction - start


//self-contained functions - start
function isValidUrl(url)
{
    var a = document.createElement('a');
    a.href = url;

    if (a.hostname.length == 0)
    {
        return false;
    }

    return (a.hostname != window.location.host);
}

function getDomain(uri)
{
    var aTag = document.createElement('a');
    aTag.href = uri;
    return aTag.hostname.replace('www.', '');
}

function removeHTMLFromStr(htmlStr)
{
    var tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = htmlStr;
    return tmpDiv.textContent || tmpDiv.innerText || '';
}

//responsible for retrieving data to server
function httpGet(uri, callback, errorCallback)
{
    var x = new XMLHttpRequest();
    x.open('GET', uri);

    x.responseType = 'json'; //text or json
    x.onload = function()
    {
        var response = x.response;
        if (!response)
        {
            errorCallback('No response.');
            return;
        }
        //console.log(response.message);
        callback(response);
    };
    x.onerror = function()
    {
        errorCallback('Network error.');
    };
    x.send();
}

function httpPost(jsonData, postURI, callback)
{
    var xhr = new XMLHttpRequest();
    xhr.open('POST', postURI);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () 
    {
        if (xhr.readyState == 4 && xhr.status == 200) 
        {
            callback(xhr.responseText);
        }
    }

    xhr.onerror = function()
    {
        console.log('httpPost(): Network error.');
        callback({});
    };

    xhr.send( JSON.stringify(jsonData) );
}
//self-contained functions - end

function getDateRange()
{
    //sample uri with date range: https://www.google.com/#q=daterange+google&tbs=cdr:1,cd_min:8/2/2016,cd_max:8/3/2016
    //&tbs=cdr:1,cd_min:8/2/2016,cd_max:8/3/2016
    var datesDict = {minDateRange: '', maxDateRange: ''};
    var dateRangeFlag = false;
    var dateRange = '';

    for(var dateRange in datesDict)
    {
        var dateRangeKey = dateRange;
        //YYYY-MM-DD
        var dateRange = document.getElementById(dateRangeKey).value;
        if( dateRange.length )
        {
            dateRange = dateRange.split('-');
            if( dateRange.length == 3 )
            {
                //Mm to m if M is 0
                if( dateRange[1][0] == '0' )
                {
                    dateRange[1] = dateRange[1][1];
                }

                //Mm to m if M is 0
                if( dateRange[2][0] == '0' )
                {
                    dateRange[2] = dateRange[2][1];
                }

                dateRangeFlag = true;
                datesDict[dateRangeKey] = dateRange[1] + '/' + dateRange[2] + '/' + dateRange[0];
            }
        }
    }

    if( dateRangeFlag )
    {
        dateRange = '&tbs=cdr:1,cd_min:' + datesDict.minDateRange + ',cd_max:' + datesDict.maxDateRange;
    }

    return dateRange;
}

function googleGetSearchURI(searchString, page)
{
    //console.log('');
    //console.log('googleGetSearchURI(): searchString: ', searchString);
    searchString = searchString.trim();
    if (searchString.length == 0 || page < 1)
    {
        return '';
    }

    //searchString modify - start
    /*
        searchString = searchString.split(' ');
        var seachQuery = '';
        for (var i = 0; i < searchString.length; i++)
        {
            seachQuery = seachQuery + searchString[i] + '+';
        }
        seachQuery = seachQuery.substr(0, seachQuery.length - 1);
    */
    //searchString modify - end
    var qOrAsQ = 'as_q';//qOrAsQ = 'q'; qOrAsQ = 'as_q';
    var seachQuery = qOrAsQ + '=' + encodeURIComponent(searchString);//for https://www.google.com/search/?as_q=alexander+desplat
    //seachQuery = 'q=' + seachQuery;//for https://www.google.com/#q=alexander+desplat//redirects sometime to /search?q=...&cad=h, leading to erratic behavior on some machines (windows)

    if (page > 1)
    {
        seachQuery = seachQuery + '&start=' + ((page - 1) * 10);
    }

    //google news flag - start
    var googleNewsFlag = '';
    if ( document.getElementById('googleNewsChkbox').checked )
    {
        googleNewsFlag = '&tbm=nws';
    }
    //google news flag - end

    //seachQuery = 'https://www.google.com/#' + seachQuery + googleNewsFlag + getDateRange();//https://www.google.com/#q=alexander+desplat
    seachQuery = 'https://www.google.com/search?' + seachQuery + googleNewsFlag + getDateRange();

    var tempObj = {searchURI: seachQuery, deleted: false};
    if( globalNewsCollection['self_collection'] )
    {
        globalNewsCollection['self_collection'].push(tempObj);
    }
    else
    {
        globalNewsCollection['self_collection'] = [tempObj];
    }

    return seachQuery;
}


function getListOfDict(linksDict)
{
    console.log('');
    console.log('getListOfDict():');
    /*
        linksDict format:
        {
            'link': {'title': '', 'crawlDatetime': ''...}
            ...
        }
    */
    var listOfLinksDicts = [];

    for (var link in linksDict)
    {
        var tempObj = {};
        tempObj.link = link;
        tempObj.title = removeHTMLFromStr(linksDict[link].title);

        //note: crawlDatetime could be blank or in form Jun 4, 2016 or datetime from now
        //sometimes date is not properly initialized
        if( isNaN(Date.parse(linksDict[link].crawlDatetime)) )
        {
            tempObj.crawlDatetime = '';   
        }
        else
        {
            tempObj.crawlDatetime = linksDict[link].crawlDatetime;
        }

        tempObj.snippet = removeHTMLFromStr(linksDict[link].snippet);

        listOfLinksDicts.push(tempObj);
    }

    return listOfLinksDicts;
}

function updateTableTitleLinks()
{
    console.log('');
    console.log('updateTableTitleLinks():');

    var caption = document.getElementById('tableCaption');
    if( caption === null )
    {
        return;
    }
    
    if( globalNewsCollection.archiveIS )
    {
        var tableCaption = document.getElementById('tableCaption');
        var indexOf = tableCaption.innerHTML.indexOf(' Archive: ');
        console.log('\tindexOf: ', indexOf);

        if( indexOf == -1 )
        {
            indexOf = tableCaption.innerHTML.length;
        }

        tableCaption.innerHTML = 
        tableCaption.innerHTML.substr(0, indexOf) + 
        ' Archive: <a href="' + globalNewsCollection.archiveIS + '" target="_blank">' + globalNewsCollection.archiveIS + '</a>';
    }
    else
    {
        var archiveLink = archiveISGetCollectionArchivedURL();
        var cardsFlag = '';
        if( globalNewsCollectionCount > 220 )
        {
            cardsFlag = ',cards';
        }
        archiveLink = archiveLink + '?off=alert' + cardsFlag;

        document.getElementById('tableCaption').innerHTML += ' Archive: <a href="' + archiveLink + '" target="_blank"> search </a>';
    }

    
}

//vis - start
function drawGrid(localNewsCollections)
{
    console.log('');
    console.log('drawGrid():');

    if (localNewsCollections.collection === undefined)
    {
        console.log('\tundefined collection');
        return;
    }
    //prepare for sharing
    
    twitterButton();
    var columnCount = 5;
    globalNewsCollectionCount = 0;

    var tdArray = [];
    for (var i = 0; i < localNewsCollections.collection.length; i++)
    {
        var newsSourceDict = localNewsCollections.collection[i];
        var type = newsSourceDict.source.type.split(' - ');
        if (type[0] == 'Newspaper')
        {
            if (type[1].toLowerCase() == 'college')
            {
                type = 'College Newspaper';
            }
            else
            {
                type = 'Newspaper';
            }
        }

        var mediaDetails;
        if (type[0].length == 0)
        {
            mediaDetails = 'My Contribution';
        }
        else
        {
            mediaDetails = newsSourceDict.source.name + ', ' + type + ', (' + newsSourceDict.source.miles + ' miles, ' + newsSourceDict.source.state + ' - ' + newsSourceDict.source.country + ')';
        }

        var newspaperLinks = newsSourceDict.links;

        //push newpaper details - start
        tdArray.push([]);
        var td = document.createElement('td');
        td.className = 'newsHeading';
        td.setAttribute("colspan", columnCount);

        var hr = document.createElement('hr');
        hr.width = '100%';
        td.appendChild(hr);
        td.appendChild(document.createTextNode((i + 1) + '. ' + mediaDetails));

        //add include/exclude entire source - start

        var includeLinkChkboxLabel = document.createElement('label');
        includeLinkChkboxLabel.style = 'padding-left: 8px; color:red;';
        includeLinkChkboxLabel.setAttribute('for', 'includeLinkChkbox');
        includeLinkChkboxLabel.className = 'pure-checkbox';

        var includeLinkChkbox = document.createElement('input');
        includeLinkChkbox.type = 'checkbox';
        includeLinkChkbox.setAttribute('sourceIndex', i);
        includeLinkChkbox.addEventListener('change', function()
        {
            excludeLink(this);
        },false);

        includeLinkChkboxLabel.appendChild(includeLinkChkbox);
        includeLinkChkboxLabel.appendChild(document.createTextNode(' Exclude (saved/archived)'));
            
        td.appendChild(includeLinkChkboxLabel);
        //add include/exclude entire source - end

        tdArray[tdArray.length - 1].push(td);
        //push newpaper details - end

        //create new row for items
        tdArray.push([]);

        globalNewsCollectionCount += newspaperLinks.length;
        for (var j = 0; j < newspaperLinks.length; j++)
        {
            //newspaperLinks[j] format: {link: crawlDatetime or nowDatetime, 'title': '', 'crawlDatetime': '', 'snippet': ''}

            //balance grid - start
            if ((j % columnCount) == 0)
            {
                //create new row for items
                tdArray.push([]);
            }
            //balance grid - end
            td = document.createElement('td');



            var linkText = newspaperLinks[j].title.trim();
            if (linkText.length == 0)
            {
                linkText = newspaperLinks[j]['link'];
            }

            if (newspaperLinks[j].crawlDatetime.trim().length != 0)
            {
                if( !isNaN(Date.parse(newspaperLinks[j].crawlDatetime)) )
                {
                    linkText = linkText + ' (' + newspaperLinks[j].crawlDatetime + ')';
                    //linkText = linkText + ' (' + moment(newspaperLinks[j].crawlDatetime).fromNow() + ')';
                }
            }



            //add embed - start
            var blockquote = document.createElement('blockquote');
            blockquote.className = globalEmbedCardClassName;

            //blockquote.setAttribute('data-card-key', 'b2a1f20a5ff5438897552ef014f2291b');
            var h4Tag = document.createElement('h4');

            var titleAtag = document.createElement('a');
            titleAtag.appendChild(document.createTextNode(linkText));
            titleAtag.href = newspaperLinks[j]['link'];
            titleAtag.target = '_blank';

            h4Tag.appendChild(titleAtag);
            blockquote.appendChild(h4Tag);
            td.appendChild(blockquote);
            //add emded - end




            //add include/exclude link - start
            /*<label for="showCardsChkbox" class="pure-checkbox">
              <input id="showCardsChkbox" type="checkbox"> Show cards
            </label>*/
            var editDiv = document.createElement('div');
            editDiv.style = 'padding-bottom: 10px; color:red;';

            /*var */includeLinkChkboxLabel = document.createElement('label');
            includeLinkChkboxLabel.setAttribute('for', 'includeLinkChkbox');
            includeLinkChkboxLabel.className = 'pure-checkbox';

            /*var */includeLinkChkbox = document.createElement('input');
            includeLinkChkbox.type = 'checkbox';
            includeLinkChkbox.setAttribute('locX', i);
            includeLinkChkbox.setAttribute('locY', j);
            includeLinkChkbox.addEventListener('change', function()
            {
                excludeLink(this);
            },false);

            includeLinkChkboxLabel.appendChild(includeLinkChkbox);
            includeLinkChkboxLabel.appendChild(document.createTextNode(' Exclude (saved/archived)'));
            editDiv.appendChild(includeLinkChkboxLabel);
            
            td.appendChild(editDiv);
            //add include/exclude link - end


            //add snippet - start
            if (newspaperLinks[j]['snippet'])
            {
                var spanTag = document.createElement('span');
                spanTag.appendChild(document.createTextNode(newspaperLinks[j].snippet));
                td.appendChild(spanTag);
            }
            //add snippet - end


            tdArray[tdArray.length - 1].push(td);
        }
    }


    var author = '';
    if( globalUniqueUserID.length != 0 )
    {
        author = globalUniqueUserID.replace(/-/g, ' ') + '\'s ';
    }

    var tableCaption = author + 'Local Stories for Query: "<i>' + localNewsCollections.query + '</i>", created: ' + specialDateFormat(localNewsCollections.timestamp);
    
    if (localNewsCollections.zipcode && localNewsCollections.city && localNewsCollections.state && localNewsCollections.country)
    {
        tableCaption = 
        tableCaption + 
        ', for <br> ' + 
        localNewsCollections.zipcode + 
        ' (' + localNewsCollections.city + 
        ' ' + localNewsCollections.state + 
        ', ' + 
        localNewsCollections.country + 
        ')';
    }
    else
    {
        console.log('\tUNEXPECTED ABSENCE OF zipcode|city|state|country');
    }

    //collectionName - start
    if( localNewsCollections.collectionName )
    {
        tableCaption = tableCaption + '. Collection name: ' + localNewsCollections.collectionName;
    }
    //collectionName - end

    tableCaption = tableCaption + '.';

    dynamicTable([], tdArray, tableCaption, 'newsColVisContainer');
    updateTableTitleLinks();

    if (globalEditingFlag == false)
    {
        setTimeout(function()
        {
            generateCards();
        }, 3000);
    }
}

function excludeLink(div)
{

    console.log('excludeLink():');
    if( !globalNewsCollection.collection )
    {
        return;
    }

    var sourceIndex = div.getAttribute('sourceIndex');
    if( sourceIndex !== null )
    {
        //exclude entire source (collection of links)
        if( sourceIndex < globalNewsCollection.collection.length )
        {
            if( globalNewsCollection.collection[sourceIndex].source.exclude === true )
            {
                //undo exclude
                globalNewsCollection.collection[sourceIndex].source.exclude = false;
                globalNewsCollection.self_collection[sourceIndex].deleted = false;
            }
            else
            {
                //exclude
                globalNewsCollection.collection[sourceIndex].source.exclude = true;
                globalNewsCollection.self_collection[sourceIndex].deleted = true;
            }
        }
    }
    else
    {
        //exclude single link
        var row = div.getAttribute('locX');
        var col = div.getAttribute('locY');

        if (row < globalNewsCollection.collection.length)
        {
            if (col < globalNewsCollection.collection[row].links.length)
            {
                if( globalNewsCollection.collection[row].links[col].exclude === true )
                {
                    globalNewsCollection.collection[row].links[col].exclude = false;
                }
                else
                {
                    globalNewsCollection.collection[row].links[col].exclude = true;
                }
            }
        }
    }
}

function editGlobalNewsCollection()
{

    console.log('');
    console.log('editGlobalNewsCollection():');

    if( !globalNewsCollection.collection )
    {
        return {};
    }
    globalEditedCollectionCount = 0;

    globalEditedCollection = {};
    var keys = Object.keys(globalNewsCollection);

    for(var i=0; i<keys.length; i++)
    {
        if( keys[i] != 'collection' )
        {
            globalEditedCollection[keys[i]] = globalNewsCollection[keys[i]];
        }
    }

    
    var collection = [];
    for(var i=0; i<globalNewsCollection.collection.length; i++)
    {
        if( globalNewsCollection.collection[i].source.exclude !== true )
        {
            var tempSourcLinkDict = {source: globalNewsCollection.collection[i].source, links: []};
            for(var j=0; j<globalNewsCollection.collection[i].links.length; j++)
            {
                if( globalNewsCollection.collection[i].links[j].exclude === true )
                {
                    console.log('\tremoving: ', globalNewsCollection.collection[i].links[j].title);
                }
                else
                {
                    globalEditedCollectionCount++;
                    tempSourcLinkDict.links.push(globalNewsCollection.collection[i].links[j]);
                }
            }
            collection.push(tempSourcLinkDict);
        }
    }
    globalEditedCollection.collection = collection;
    //console.log('\tglobalEditedCollection: ', globalEditedCollection);

}

function dynamicTable(headerArray, tdArray, inCaptionText, containerID)
{
    if (containerID != undefined)
    {
        //d3.select('#' + containerID).select('table').remove();
        var container = document.getElementById(containerID);
        var gridtable = document.getElementsByClassName('gridtable')[0];
        if( gridtable != undefined )
        {
            container.removeChild(gridtable);
        }
    }

    var table = document.createElement('table');
    table.className += "gridtable";

    var tr = document.createElement('tr');
    for (var i = 0; i < headerArray.length; i++)
    {
        var headingText = document.createTextNode(headerArray[i]);
        var header = document.createElement('th');

        header.appendChild(headingText);
        tr.appendChild(header);
    }
    table.appendChild(tr);

    var caption = document.createElement('caption');
    caption.id = 'tableCaption';
    caption.innerHTML = inCaptionText;

    var tableBody = document.createElement('tbody');
    table.appendChild(tableBody);
    table.appendChild(caption);

    for (var i = 0; i < tdArray.length; i++)
    {
        var tr = document.createElement('tr');
        tableBody.appendChild(tr);
        for (var j = 0; j < tdArray[i].length; j++)
        {
            tr.appendChild(tdArray[i][j]);
        }
    }

    if (containerID != undefined)
    {
        var container = document.getElementById(containerID);
        container.appendChild(table);
    }
    else
    {
        document.body.appendChild(table);
    }
}

function toggleCards()
{
    console.log('');
    console.log('toggleCards():');

    if( !globalNewsCollection.collection )
    {
        return;
    }
    
    if( document.getElementById('showCardsChkbox').checked )
    {
        //assumption is that editing is done
        globalEditingFlag = false;
        createAlertMessageBoard('alert info', '...generating cards');
    }

    drawGrid(globalNewsCollection);
}

function generateCards()
{
    //reset
    globalEditingFlag = false;

    //console.log('generateCards() SWITCHED OFF');
    //return;

    console.log('');
    console.log('generateCards():');
    if ( document.getElementById('showCardsChkbox').checked == false )
    {
        console.log('\tCards off');
        return;
    }
    
    var cards = document.getElementsByClassName(globalEmbedCardClassName);
    console.log('\tcards count: ' + cards.length);

    if (cards.length != globalNewsCollectionCount)
    {
        if (globalDebugFlag)
        {
            console.log('\tTable hasn\'t finished loading, will return in 3 seconds');
        }
        setTimeout(function()
        {
            generateCards();
        }, 3000);
    }
    else
    {
        if (globalDebugFlag)
        {
            console.log('\tTable finished loading, will not return');
        }

        //set embedly defaults - start
        embedly("defaults",
        {
            cards:
            {
                width: '80%'/*,
                'align': 'left'*/
            }
        });
        //set embedly defaults - end

        
        //reset
        globalNewsCollectionCount = -1;
        var alertCloseButton = document.getElementById('alertCloseButton');
        if( alertCloseButton )
        {
            alertCloseButton.click();
        }

        setTimeout(function()
        {
            for (var i = 0; i < cards.length; i++)
            {
                embedly('card', cards[i]);
            }
        }, 500);
    }
}

function createAlertMessageBoard(className, msg)
{
    if (className === undefined)
    {
        className = 'alert warning';
    }

    if (msg === undefined)
    {
        msg = 'Alert!';
    }

    console.log('');
    console.log('createAlertMessageBoard():');
    var msgParentDiv = document.getElementById('alertMessage');
    var prevMsg = document.getElementById('alertMessageMain');

    if(prevMsg)
    {
        //don't repeat same msg
        if (prevMsg.innerHTML === msg)
        {
            return;
        }
    }

    /*
        //credit to: http://www.w3schools.com/howto/tryit.asp?filename=tryhow_js_alerts
        div format:
        <div class="alert"> class set: alert, alert success, alert info (blue), alert warning (orange)
            <span class="alertClosebtn">&times;</span>
            <strong>Danger!</strong> Indicates a dangerous or potentially negative action.
        </div>
    */

    var msgDiv = document.createElement('div');
    msgDiv.className = className;

    var closeSpan = document.createElement('span');
    closeSpan.className = 'alertClosebtn';
    closeSpan.id = 'alertCloseButton';
    closeSpan.innerHTML = '&times;';
    closeSpan.onclick = function()
    {
        document.getElementById('alertStopButton').innerHTML = 'STOP';
        document.getElementById('alertMessage').innerHTML = '';
    };

    var stopSpan = document.createElement('span');
    stopSpan.className = 'alertStopbtn';
    stopSpan.id = 'alertStopButton';
    stopSpan.innerHTML = 'STOP';
    stopSpan.onclick = function()
    {
        this.innerHTML = 'STOPPING';
        globalStopFlag = true;
    };


    var strongTag = document.createElement('strong');
    strongTag.id = 'alertMessageMain';
    //strongTag.appendChild(document.createTextNode(msg));
    strongTag.innerHTML = msg;

    msgDiv.appendChild(closeSpan);
    msgDiv.appendChild(stopSpan);
    msgDiv.appendChild(strongTag);
    msgParentDiv.appendChild(msgDiv);
}
//vis - end

function saveRemoteGenericResponseHandler(saveResponse)
{
    console.log('');
    console.log('saveRemoteGenericResponseHandler(), saveResponse: ', saveResponse);

    if( saveResponse == 'Saved' )
    {
        //new schema
        createAlertMessageBoard('alert success', 'Saved: <a href="' + getRemoteSavedURI() + '" target="_blank">My collection</a>');
    }
    else if( saveResponse == 'No space' )
    {   
        createAlertMessageBoard('alert', 'Sorry, your collection could not be saved because we\'ve run out of storage space. Try saving your collection locally.');
    }
}

function getRemoteSavedURI()
{
    console.log('');
    console.log('getRemoteSavedURI():');
    
    //new schema format: http://www.localmemory.org/vis/collections/VXiBJ8mWfrl8gb8anL7c/queries/usa-33109-zika-virus-15?off=cards,alert
    return 'http://www.localmemory.org/vis/collections/' + globalUniqueUserID + '/' + 'queries' + '/' + getSavedQueryID();
}

//responsible for determining uri scheme
function getSavedQueryID()
{
    if(!globalNewsCollection.query)
    {
        return '';
    }

    var datestamp = new Date(globalNewsCollection.timestamp);

    var year = datestamp.getFullYear() + '';
    var month = (datestamp.getMonth() + 1) + '';
    var day = datestamp.getDate() + '';

    if( month.length == 1 )
    {
        month = '0' + month;
    }
    if( day.length == 1 )
    {
        day = '0' + day;
    }

    datestamp = year + '-' + month + '-' + day;
    
    return getRequestID(
                            globalNewsCollection.country, 
                            globalNewsCollection.zipcode, 
                            globalNewsCollection.query,
                            globalNewsCollection.maximumLinksPerSource
                        ) + '-' + datestamp;
}

function saveRemotely(callback)
{
    console.log('');
    console.log('saveRemotely():');
    
    //check if user has excluded some links
    editGlobalNewsCollection();
    if( !globalEditedCollection.collection )
    {
        return;
    }
    
    globalEditedCollection.userID = globalUniqueUserID;//identify user
    globalEditedCollection.queryID = getSavedQueryID();//identify query of user
    globalEditedCollection.userIDQueryID = globalEditedCollection.userID + '_' + globalEditedCollection.queryID;//identify single request of user
    globalEditedCollection.pvtID = globalPvtID;

    console.log('\tuserIDQueryID: ', globalEditedCollection.userIDQueryID);

    //implement some security
    httpPost(globalEditedCollection, globalBaseURI + 'saveVis/', function(response)
    {
        //DON'T EXPOSING pvtID - start
        delete globalEditedCollection.pvtID;
        //DON'T EXPOSING pvtID - end

        response = JSON.parse(response);
        console.log('\tresponse: ', response);
        
        if( callback )
        {
            if( response.msg == 'Saved' )
            {
                globalAppState.savedRemotelyFlag = true;
            }

            callback(response.msg);
        }
    });
}

function archiveISGetCollectionArchivedURL()
{
    if(!globalNewsCollection.query)
    {
        return '';
    }

    //new schema
    return 'https://archive.is/' + getRemoteSavedURI();
}

function archiveIS(saveResponse)
{
    console.log('');
    console.log('archiveIS():');

    if(saveResponse == 'Saved')
    {
        document.getElementById('archiveButton').disabled = true;
        createAlertMessageBoard('alert warning', '...archiving, please do not close archive tab');

        if( globalNewsCollection.archiveIS )
        {
            delete globalNewsCollection.archiveIS;
        }

        archiveISSendParentChildrenLinks('', -1, -1, -1);
    }
}

function archiveISSendParentChildrenLinks(archivedPageTab, row, col, progressCount)
{
    console.log('');
    console.log('archiveISSendChildrenLinks():');
    console.log('\trow: ', row);
    console.log('\tcol: ', col);

   
    if( row == -1 && col == -1 )
    {
        var cardsFlag = '';
        if( globalEditedCollectionCount > 220 )
        {
            //cards of if globalEditedCollectionCount exceeds a threshold to avoid archive.is timeout
            cardsFlag = ',cards';
        }

        console.log('\tparent case');
        //new schema
        var parentURI = 'https://archive.is/?url=' + encodeURIComponent(getRemoteSavedURI() + '?off=alert' + cardsFlag);
        console.log('\tparentURI: ', parentURI);

        archiveISCreateTabForURI(parentURI, 0, 0, 0);
    }
    else
    {
        console.log('\tchildren case');
        console.log('\tarchivedPageTab: ', archivedPageTab.url);
        
        var nextURI = '';
        var foundNextFlag = false;
        for(var i=row; i<globalEditedCollection.collection.length; i++)
        {
            for(var j=col; j<globalEditedCollection.collection[i].links.length; j++)
            {
                nextURI = globalEditedCollection.collection[i].links[j].link;
                //next place to start
                //continue visiting row, but shift to next column
                row = i;
                col = j+1;
                foundNextFlag = true;
                break;
            }

            if( col == globalEditedCollection.collection[i].links.length )
            {
                //all colums for row have been visited, goto next row reset column
                row++;
                col = 0;
            }

            if( foundNextFlag )
            {
                break;
            }
        }


        //first value of archivedPageTab is parent page, subsequent values are other archived pages' short uri
        document.getElementById('alertCloseButton').click();
        
        if( !globalNewsCollection.archiveIS )
        {
            var shortLink = archivedPageTab.url;
            shortLink = shortLink.replace('https://archive.is/?url=', 'https://archive.is/');

            createAlertMessageBoard('alert warning', '...archiving, please don\'t close archive tab. Your archived collection: <a href="' + shortLink + '" target="_blank">' + shortLink + '</a>');
            globalNewsCollection.archiveIS = shortLink;
        }
        else
        {
            //progress bar - start
            createAlertMessageBoard('alert warning', '...archiving ' + 
                progressCount  + ' of '+ globalEditedCollectionCount  + 
                ', please don\'t close archive tab. Your saved collection: <a href="' + 
                globalNewsCollection.archiveIS + '" target="_blank">' + globalNewsCollection.archiveIS + '</a>. Sending to archive: ' + nextURI
            );
            //progress bar - end
        }

        
        console.log('\tsendingForArchive: ', nextURI);
        if( nextURI == '' || globalStopFlag )
        {
            if( globalStopFlag )
            {
                globalStopFlag = false;
            }

            archiveISDone(archivedPageTab);
        }
        else
        {
            var childURI = 'https://archive.is/?url=' + nextURI;
            archiveISLoadURIInTab(archivedPageTab, childURI, row, col, progressCount+1);
        }

    }
}


function archiveISCreateTabForURI(uri, row, col, progressCount)
{
    console.log('');
    console.log('archiveISCreateTabForURI():');

    chrome.tabs.query({'active': true}, function(parentTabs)
    {
        if( parentTabs.length != 0 )
        {
            chrome.tabs.create(
            {
                'url': uri,
                'index': parentTabs[0].index + 1,
                'active': false
            },
            function(childTab)
            {
                console.log('\tsleep: 2s');
                chrome.tabs.get(childTab.id, function(tab)
                { 
                    console.log('\tcreated taburl/status/id: ', tab.url, tab.status, tab.id);
                    globalCurTabIDsDict[tab.id] = tab;
                    archiveISPreGetShortLink(tab, row, col, progressCount);
                });
            });
        }
    });
}

//vary wait time to allow click archive again
function archiveISLoadURIInTab(tab, uri, row, col, progressCount)
{
    //update tab
    console.log('');
    console.log('archiveISLoadURIInTab():');

    //setTimeout(function()
    //{
    chrome.tabs.update(tab.id, {url: uri}, function(updatedTab)
    {
        //early update of tab state before chrome.tabs.onUpdated() called
        globalCurTabIDsDict[tab.id] = updatedTab;

        console.log('\tloaded tab/status: ', updatedTab.url, updatedTab.status);
        console.log('\tloaded tab expected: ', uri);
        archiveISPreGetShortLink(updatedTab, row, col, progressCount);
    });
    //}, delay);
}

function archiveISPreGetShortLink(tab, row, col, progressCount)
{
    console.log('');
    console.log('archiveISPreGetShortLink():');
    console.log('\tglobalTabReadyCount: ', globalTabReadyCount);

    if( globalTabReadyCount > 100 )
    {
        globalTabReadyCount = globalMaxTabReadyCount + 1;
    }

    if( globalTabReadyCount > globalMaxTabReadyCount )
    {
        document.getElementById('alertCloseButton').click();
        createAlertMessageBoard('alert', 'Attention required: Please refresh archive tab.');
    }

    //ensure tab is completely loaded before running script - start
    //isTabReady() does do a mismatch check since
    if( isTabReady(tab) == false )
    {
        globalTabReadyCount++;
        setTimeout(function()
        {
            archiveISPreGetShortLink(tab, row, col, progressCount);
        }, 1000);
        
        return;
    }
    
    //ensure tab is completely loaded before running script - end
    
    globalTabReadyCount = 0;
    tab = globalCurTabIDsDict[tab.id];
    
    chrome.tabs.executeScript(tab.id,
    {
        file: "./scripts/archiveIS.js"
    });

    var delay = document.getElementById('archivingDelay').value;
    if(delay < 2 || delay > 60 )
    {
        delay = 2;
    }

    console.log('\tdelay: ', delay);
    delay = delay * 1000;
    
    setTimeout(function()
    {
        //small delay for script to return, placing this in callback of .executeScript wasn't reliable
        archiveISGetShortLink(tab, row, col, progressCount);
    }, delay);
    
}

function archiveISGetShortLink(tab, row, col, progressCount)
{
    console.log('');
    console.log('archiveISGetShortLink():');
    console.log('\tglobalTabReadyCount: ', globalTabReadyCount);

    if( globalTabReadyCount > 100 )
    {
        globalTabReadyCount = globalMaxTabReadyCount + 1;
    }

    if( globalTabReadyCount > globalMaxTabReadyCount )
    {
        document.getElementById('alertCloseButton').click();
        createAlertMessageBoard('alert', 'Attention required: Please refresh archive tab.');
    }

    //ensure tab is completely loaded before running script - start
    if( isTabReady(tab) == false )
    {
        globalTabReadyCount++;
        setTimeout(function()
        {
            archiveISGetShortLink(tab, row, col, progressCount);
        }, 1000);
        
        return;
    }
   
    //ensure tab is completely loaded before running script - end
    
    //update tab
    globalTabReadyCount = 0;
    tab = globalCurTabIDsDict[tab.id];
    if( row == 0 && col == 0 )
    {
        console.log('\tmaster page');
        //wait a little to attempt getting short link
        setTimeout(function()
        {
            chrome.tabs.get(tab.id, function(tab)
            {
                console.log('\tarchive.JS url: ', tab.url);
                //chrome.tabs.update(tab.id, {url: 'about:blank'});
                archiveISSendParentChildrenLinks(tab, row, col, progressCount);
            });

        }, 5000);
    }
    else
    {
        chrome.tabs.get(tab.id, function(tab)
        {
            console.log('\tarchive.JS url: ', tab.url);
            //chrome.tabs.update(tab.id, {url: 'about:blank'});
            archiveISSendParentChildrenLinks(tab, row, col, progressCount);
        });
    }
    
}

function archiveISDone(tab)
{
    console.log('');
    console.log('archiveISDone():');
    //check if tab is still in use, decide condition for: //chrome.tabs.remove(archivedPageTab.id, null);, when shor gotten set to blank
    console.log('\tarchivedParentURI: in globalNewsCollection');
    updateTableTitleLinks();

    setTimeout(function()
    {
        chrome.tabs.remove(tab.id, null);
        document.getElementById('archiveButton').disabled = false;
        document.getElementById('alertCloseButton').click();
        createAlertMessageBoard('alert success', 'Done archiving. My archived collection: <a href="' + globalNewsCollection.archiveIS + '" target="_blank">' + globalNewsCollection.archiveIS + ' </a>');
    }, 5000);
}
