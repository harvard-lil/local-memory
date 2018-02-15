//function drawGrid(localNewsCollections, columnCount, uniqueUserID, embedCardClassName, twitterButton, excludeLink, generateCards, updateTableTitleLinks)
function drawGrid(localNewsCollections, columnCount, uniqueUserID, embedCardClassName, functionPackage)
{
    console.log('');
    console.log('drawGrid():');

    if ( !localNewsCollections.collection )
    {
        console.log('\tundefined collection');
        return;
    }
    
    if( columnCount === undefined )
    {
        columnCount = 5;
    }
    console.log('\tcolumnCount:', columnCount);
    
    if( functionPackage.twitterButton )
    {
        functionPackage.twitterButton();
    }
    
    globalNewsCollectionCount = 0;//review, consider local var - pass by reference
    var tdArray = [];
    var author = '';
    var tableCaption = '';

    for (var i = 0; i < localNewsCollections.collection.length; i++)
    {
        //standard schema - 15 - start
        var newsSourceDict = localNewsCollections.collection[i];
        var type = newsSourceDict.source['media-class'].toUpperCase();
        var mediaDetails = '';
        var newspaperLinks;
        var linkText = '';

        newsSourceDict.source['media-subclass'] = newsSourceDict.source['media-subclass'].trim();

        if( newsSourceDict.source['media-subclass'].length != 0 )
        {
            type = type + ' (' + newsSourceDict.source['media-subclass'] + ') ';
        }
        //standard schema - 15 - end
        
        //investigate-0
        if ( newsSourceDict.source.name === 'User Contribution' )
        {
            mediaDetails = 'My Contribution';
        }
        else
        {
            mediaDetails = newsSourceDict.source.name;
            if( type.length != 0 )
            {
                mediaDetails = mediaDetails + ', ' + type;
            }

            if( newsSourceDict.source.miles && newsSourceDict.source.state && newsSourceDict.source.country )
            {
                if( newsSourceDict.source.state.length != 0 && newsSourceDict.source.country.length != 0 )
                {
                    mediaDetails = mediaDetails + ', (' + newsSourceDict.source.miles + ' miles, ' + newsSourceDict.source.state + ' - ' + newsSourceDict.source.country + ')';
                }
            }
        }

        newspaperLinks = newsSourceDict.links;

        //push newspaper details - start
        tdArray.push([]);
        var td = document.createElement('td');
        td.className = 'newsHeading';
        td.setAttribute("colspan", columnCount);

        var hr = document.createElement('hr');
        hr.width = '100%';
        td.appendChild(hr);
        td.appendChild(document.createTextNode((i + 1) + '. ' + mediaDetails));

        //add include/exclude entire source - start
        if( functionPackage.excludeLink )
        {
            var includeLinkChkboxLabel = document.createElement('label');
            includeLinkChkboxLabel.style = 'padding-left: 8px; color:red;';
            includeLinkChkboxLabel.setAttribute('for', 'includeLinkChkbox');
            includeLinkChkboxLabel.className = 'pure-checkbox';

            var includeLinkChkbox = document.createElement('input');
            includeLinkChkbox.type = 'checkbox';
            includeLinkChkbox.setAttribute('sourceIndex', i);
            includeLinkChkbox.addEventListener('change', function()
            {
                functionPackage.excludeLink(this);
            },false);

            includeLinkChkboxLabel.appendChild(includeLinkChkbox);
            includeLinkChkboxLabel.appendChild(document.createTextNode(' Exclude (saved/archived)'));
                
            td.appendChild(includeLinkChkboxLabel);
        }
        //add include/exclude entire source - end

        tdArray[tdArray.length - 1].push(td);
        //push newspaper details - end

        //create new row for items
        tdArray.push([]);

        globalNewsCollectionCount += newspaperLinks.length;
        for (var j = 0; j < newspaperLinks.length; j++)
        {
            //balance grid - start
            if ((j % columnCount) == 0)
            {
                //create new row for items
                tdArray.push([]);
            }
            //balance grid - end
            td = document.createElement('td');

            linkText = newspaperLinks[j].title.trim();
            if (linkText.length == 0)
            {
                linkText = newspaperLinks[j]['link'];
            }

            //add embed - start
            var blockquote = document.createElement('blockquote');
            blockquote.className = embedCardClassName;

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
            if( functionPackage.excludeLink )
            {
                var editDiv = document.createElement('div');
                editDiv.style = 'padding-bottom: 10px; color:red;';

                includeLinkChkboxLabel = document.createElement('label');
                includeLinkChkboxLabel.setAttribute('for', 'includeLinkChkbox');
                includeLinkChkboxLabel.className = 'pure-checkbox';

                includeLinkChkbox = document.createElement('input');
                includeLinkChkbox.type = 'checkbox';
                includeLinkChkbox.setAttribute('locX', i);
                includeLinkChkbox.setAttribute('locY', j);
                includeLinkChkbox.addEventListener('change', function()
                {
                    functionPackage.excludeLink(this);
                },false);

                includeLinkChkboxLabel.appendChild(includeLinkChkbox);
                includeLinkChkboxLabel.appendChild(document.createTextNode(' Exclude (saved/archived)'));
                editDiv.appendChild(includeLinkChkboxLabel);
                
                td.appendChild(editDiv);
            }
            //add include/exclude link - end


            //add snippet - start
            var snippetText = '';
            //standard schema - 16
            if (newspaperLinks[j]['crawl-datetime'].trim().length != 0)
            {
                //standard schema - 17
                if( !isNaN(Date.parse(newspaperLinks[j]['crawl-datetime'])) )
                {
                    //standard schema - 18
                    snippetText += newspaperLinks[j]['crawl-datetime'];
                }
            }
            
            var spanTag = document.createElement('span');
            if ( newspaperLinks[j].snippet )
            {
                if( snippetText.length != 0 )
                {
                    snippetText += ' - ';
                }
                
                snippetText += newspaperLinks[j].snippet;
                if(snippetText.length > 140)
                {
                    snippetText = snippetText.substr(0, 155) + '...';
                }
            }

            spanTag.appendChild(document.createTextNode(snippetText));
            td.appendChild(spanTag);
            //add snippet - end

            tdArray[tdArray.length - 1].push(td);
        }
    }

    if( uniqueUserID !== undefined )
    {
        if( uniqueUserID.length != 0 )
        {
            author = uniqueUserID.replace(/-/g, ' ') + '\'s ';
        }
    }

    tableCaption = author + 'Local Stories for Query: "<i>' + localNewsCollections.query + '</i>", created: ' + specialDateFormat(localNewsCollections.timestamp);

    if (localNewsCollections.zipcode !== undefined && localNewsCollections.city !== undefined && localNewsCollections.state !== undefined && localNewsCollections.country !== undefined)
    {
        var optionalZipcode = '';
        var optionalState = '';

        if( localNewsCollections.zipcode.length !=0 )
        {
            optionalZipcode = ', for <br> ' + localNewsCollections.zipcode;
        }

        if( localNewsCollections.state.length !=0 )
        {
            optionalState = localNewsCollections.state + ', ';
        }

        if( localNewsCollections.city.length !=0 && localNewsCollections.country.length !=0 )
        {
            tableCaption = 
            tableCaption + 
            optionalZipcode + 
            ' (' + localNewsCollections.city + 
            ' ' + optionalState + 
            localNewsCollections.country + 
            ')';
        }
    }
    else
    {
        console.log('\tUNEXPECTED ABSENCE OF zipcode|city|state|country');
    }

    //collectionName - start
    //standard schema - 19
    if( localNewsCollections['collection-name'] )
    {
        //standard schema - 20
        tableCaption = tableCaption + '. Collection name: ' + localNewsCollections['collection-name'];
    }
    //collectionName - end

    tableCaption = tableCaption + '.';
    dynamicTable([], tdArray, tableCaption, 'newsColVisContainer');

    if( functionPackage.updateTableTitleLinks )
    {
        functionPackage.updateTableTitleLinks();
    }

    if( functionPackage.gridScrolling )
    {
        functionPackage.gridScrolling();
    }
    
    if (functionPackage.generateCards )
    {
        setTimeout(function()
        {
            functionPackage.generateCards();
        }, 3000);
    }
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

//credit: http://stackoverflow.com/a/901144
function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return '';
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}