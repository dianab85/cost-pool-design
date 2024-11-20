(function ($, jsPDF, html2canvas) {

    let interactive_name = getParameterByName("name");
    let dollyUrl = Dolly.api_url+'/api/v1/interactives/';

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    if(interactive_name === '' || interactive_name === null) {
        
        $('#cost-pools-interactive').empty();
        $('#cost-pools-interactive').append('<p>Add the unique name of the dolly interactive.</p>');
    }

    let $costItemName, $studentName, $costItemValue, $costItemId, $costDriver, $costItems, $costItemsListNode, $costItemsCount, $total, $studentCostPoolDesign = {}, data = {}, userId,suggestedCostPool, retry = false;

    //function from blog post https://blog.abelotech.com/posts/number-currency-formatting-javascript/ on formatting numbers to strings with regular expressions. @Tom Pawlak
    function formatNumber(num) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
    }

    function convertToNumber(string) {
        return parseInt(string.replace(/,/g, ''));
    }

    function getStudentAnswers(id) {
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (id === key) {
                    addStudentJsonStringToDOM(JSON.stringify(data[key].costPools), 'Your', $('#step-2 .pools__pool-item--no-opacity:first-child'));
                    $('#select-student').attr('data-value', JSON.stringify(data[key].costPools));
                    $('#step-1 p > span').html(data[key].student);

                } else {
                    $('#select-student').append(`<option value="${key}" data-value='${JSON.stringify(data[key].costPools)}'>${data[key].student}</option>`);
                }
            }
        }
    }

    function addStudentJsonStringToDOM(string, name, parent) {
        let costPoolDesign = JSON.parse(string);

        parent.empty();
        parent.append(`<h3>${name.trim()} Cost Pools:</h3>`);

        let x = 1;
        for (const key in costPoolDesign) {

            if (costPoolDesign.hasOwnProperty(key)) {

                let htmlString = `<div class="pool__container__item-list"><h4>Cost Pool ${x}:</h4>`;
                let items = costPoolDesign[key];

                let total = 0;
                items.forEach(element => {
                    htmlString += ` <p><span>${element.itemName}</span>
                    <span>${element.value}</span></p> `;
                    total += parseInt(convertToNumber(element.value));
                });

                htmlString += `<div class="pool__container__item-list__total">
                <p><span>Total</span><span>${formatNumber(total)}</span></p>
                </div>
                <div class="pool__container__item-list__total pool__container__item-list__cost-driver">
                    <p><span>Cost Driver:</span> ${key}</p>
                </div>`

                htmlString += `</div>`;
                parent.append(htmlString);
            }
            x++;
        }
    }

    function init() {

        userId = Dolly.cookieGet(interactive_name);

        if (userId) {
            Dolly.ajaxGet(dollyUrl + interactive_name + "/data", getData);
            
            let suggestedCostPoolNode = document.querySelector('#step-2 .pools > .pools__pool-item--no-opacity:last-child');
            suggestedCostPool = suggestedCostPoolNode.cloneNode(true);

                       
            
            $('#step-1').hide();
            $('#step-2').show();
        } else {
            $('#step-1').show();
            $('#step-2').hide();
        }
    }

    function getData(response) {

        for (const key in response) {
            if (response.hasOwnProperty(key)) {
                data[response[key].id] = JSON.parse(response[key].data);
            }
        }
        getStudentAnswers(userId);

    }

    function addPopupMessage(message, type, time, e) {

        userId = $(e.currentTarget).attr('id');

        if (userId === 'start') {

            let $parent = $(e.currentTarget).parents('.center');

            $parent.find('h2').after(`<div class="alert alert-${type}" role="alert"><div class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></div><p>${message}</p></div>`);

            window.setTimeout(deleteInfoNotices, time);
        }
        else {
            let $parent = $(e.currentTarget).parents('.card');

            $parent.find('h2').after(`<div class="alert alert-${type}" role="alert"><div class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></div><p>${message}</p></div>`);

            window.setTimeout(deleteInfoNotices, time);
        }

        $('.alert').fadeTo(300, 1);
        $("html, body").animate({ scrollTop: 0 }, "slow");
    }

    function fade() {
        $('.alert').each(function (index, element) {
            $(element).remove();
        });
    }

    function deleteInfoNotices() {
        $('.alert').each(function (index, element) {
            $(element).fadeTo(300, 0);
            window.setTimeout(fade, 400);

        });
    }

    function removeCostItem(e) {
        e.preventDefault();

        $costItemsListNode = $(e.currentTarget).parents('.pool__container__item-list');

        $costItemId = $(e.currentTarget).parent('p').attr('data-id');
        $costItemValue = convertToNumber($(e.currentTarget).parent('p').find('span:nth-child(2)').text());

        $costItemsCount = $costItemsListNode.find('>p').length;

        if ($costItemsCount <= 1) {
            //remove p and total
            $(e.currentTarget).parents('.pool__container__item-list').remove();

        } else {
            //remove p
            $total = parseInt($costItemsListNode.find('.pool__container__item-list__total').attr('data-value')) - $costItemValue;

            $costItemsListNode.find('.pool__container__item-list__total').attr('data-value', $total);
            $costItemsListNode.find('.pool__container__item-list__total').attr('data-value', $total);

            $costItemsListNode.find('.pool__container__item-list__total').html(`<p><span>Total</span><span>${formatNumber($total)}</span></p>`);

            $(e.currentTarget).parent('p').remove();

            $costItemsListNode.find('.pool__container__item-list__total > p').fadeTo(300, 1);
            //new total
        }

        $(`.pool__container__header select option[value=${$costItemId}]`).each(function (index, element) {
            $(element).show();
        });
    }

    function validateCostItemlist() {
        let $check;
        $('.pools__pool-item:first-child .pool__container__header').find('option').each(function (index, element) {

            if ($(element).css('display') !== 'none') {
                $check = false;
            }
        });
        if ($check === false) {
            return false;
        }
    }

    function validateCostDriver() {
        let $check;

        $('.pool__container').each(function (index, element) {

            if ($(element).find('.pool__container__item-list').length > 0) {

                $costDriver = $(element).next().find('input[type=text]').val().trim();

                if ($costDriver === null || $costDriver === '' || $costDriver === undefined) {
                    $check = false;
                }
            }

        });

        if ($check === false) {
            return false;
        } else {
            return true;
        }
    }

    function postDone(response) {
        userId = response.id;
        Dolly.cookieSet(interactive_name, userId, 500);
        //success
        Dolly.ajaxGet(dollyUrl + interactive_name + "/data", getData);
        //get request for the list of students & their designs


    }

    function submitStudentAnswerToDatabase(data) {

        let post_data = { "data": data };

        Dolly.ajaxPost(dollyUrl + interactive_name + "/data", post_data, postDone);

    }

    function createDataString(){
        $studentCostPoolDesign.costPools = {};

        $('#step-1 .pool__container__item-list').each(function (index, element) {

            let $name = $(element).parents('.pool__container').next().find('input[type=text]').val();
            $studentCostPoolDesign.costPools[$name] = [];

            $(element).find('>p').each(function (index, element) {

                let costItem = {
                    id: $(element).attr('data-id'),
                    value: $(element).find('span:nth-child(2)').text().trim(),
                    itemName: $(element).find('span:first-child').text().trim()
                }

                $studentCostPoolDesign.costPools[$name].push(costItem);

            });
        });

    }

    //form submission
    function readyToPost(e) {

        createDataString();

        let jsonString = JSON.stringify($studentCostPoolDesign);
        let domString = JSON.stringify($studentCostPoolDesign.costPools);

        submitStudentAnswerToDatabase(jsonString);
        addStudentJsonStringToDOM(domString, 'Your', $('#step-2 .pools .pools__pool-item--no-opacity:first-child'));

        $('#step-1').hide();
        $('#step-2').show();
        let suggestedCostPoolNode = document.querySelector('#step-2 .pools > .pools__pool-item--no-opacity:last-child');
        suggestedCostPool = suggestedCostPoolNode.cloneNode(true);

    }

    init();

    //on change pools dropdown
    $('#step-1 .pool__container__header select').change(function () {

        event.preventDefault();

        var $countVisibleCostItems = 0;
        $(this).find('option').each(function (index, element) {
            // element == this
            if ($(element).css('display') !== 'none') {
                $countVisibleCostItems++;
            }
        });

        $costItemName = $(this).children("option:selected").text();
        $costItemId = parseInt($(this).val());
        $costItemValue = parseInt($(this).children("option:selected").attr('data-value'));
        $costItemsListNode = $(this).parents('.pool__container__header').next();

        if (Boolean($costItemsListNode.children('.pool__container__item-list__total').length) === false) {
            //change total
            $(`<div class="pool__container__item-list"><p data-id="${$costItemId}"><span>${$costItemName}</span><span>${formatNumber($costItemValue)}</span><span class="pool__container__delete"><i class="fa fa-times"></i></span></p><div data-value="${$costItemValue}" class="pool__container__item-list__total"><p><span>Total</span><span>${formatNumber($costItemValue)}</span></p></div></div>`).appendTo($(this).parents('.pool__container'));

        } else {

            $total = parseInt($costItemsListNode.children('.pool__container__item-list__total').attr('data-value')) + $costItemValue;

            $costItemsListNode.children('.pool__container__item-list__total').attr('data-value', $total);
            $costItemsListNode.children('.pool__container__item-list__total').html(`<p><span>Total</span><span>${formatNumber($total)}</span></p>`);

            $costItems = `<p data-id="${$costItemId}"><span>${$costItemName}</span><span>${formatNumber($costItemValue)}</span><span class="pool__container__delete"><i class="fa fa-times"></i></span></p>` + $(this).parents('.pool__container__header').next().html();

            $(this).parents('.pool__container__header').next().html($costItems);

        }

        $('.pool__container__header select option[value=' + $costItemId + ']').hide();
        $(this).val("0");

        $('.pool__container__item-list p').fadeTo(300, 1);

        $('.pool__container__delete').click(function (event) {
            removeCostItem(event);
        });

    });

    //on change - select peer pool design
    $('#step-2 #select-student').change(function (e) {
        e.preventDefault();
        let string = $(this).children("option:selected").attr('data-value');
        let studentName = $(this).children("option:selected").text();
        addStudentJsonStringToDOM(string, studentName, $('#step-2 .pools .pools__pool-item--no-opacity:last-child'));
    });

    // start activity
    $('#start').click(function (e) {
        e.preventDefault();

        $studentName = $(e.currentTarget).parents('.input-group').find('input[type=text]').val().trim();

        if ($studentName === null || $studentName === '' || $studentName === undefined) {

            addPopupMessage('We need your name before you can start the activity.', 'danger', 5000, e);
        }
        else {
            $studentCostPoolDesign.student = $studentName;
            $('#step-1 p span').html($studentName);

            $(e.currentTarget).parents('.card__alert').slideToggle({
                duration: 400
            });
        }
    });



    // submit form
    $('#submit-cost-pool-design').click(function (e) {
        e.preventDefault();
        
        if (validateCostItemlist() === false) {
            addPopupMessage('Please add each cost item into a cost pool before submitting.', 'danger', 5000, e);
        } else if (validateCostDriver() === false) {
            addPopupMessage('Please type a cost driver for each cost pool before submitting.', 'danger', 5000, e);
        } else {
            if(retry === true){
                createDataString();   
                var put_data = {"data": JSON.stringify($studentCostPoolDesign)};
                console.log(userId);
                Dolly.ajaxPut(dollyUrl+interactive_name+"/data/"+userId, put_data, putDone);
                function putDone(response){
                    console.log(response.id);
                    $('#step-1').hide();
                    $('#step-2').show();
                    postDone(response);
                }
            }else {
                //else do this function
                readyToPost(e);
            }
        }

    });

    function clearCostPools(){
        $('#step-1 .pool__container__item-list').each(function (index, element) {
            $(element).remove();
         });
         $('#step-1 .pool__container__header select option:not(#step-1 .pool__container__header select option:first-child)').each(function (index, element) {
             $(element).show();            
        });
    }

    $('#clear-cost-pools').click(function (e) { 
        e.preventDefault();
        clearCostPools();

    });

    $('#Retry').click(function (e) { 
        e.preventDefault();
        console.log('hi there');
        retry = true;
        clearCostPools();
        
        $('#step-1 .card__alert').hide();
        $('#step-1 p > span').text($studentName);
        $('#step-1').show();

        $('#step-2').hide();
        
    });

    $('#download').click(function () {

        document.querySelector('#step-2 .pools > .pools__pool-item--no-opacity:last-child').remove();
        document.querySelector('#step-2 .pools').append(suggestedCostPool);

        let twoSections = document.querySelectorAll('#step-2 .pools .pools__pool-item');

        var htmlElement = document.createElement('div');

        twoSections.forEach(section => {
            let duplicate = section.cloneNode(true);
            htmlElement.append(duplicate);
        });
        htmlElement.setAttribute('style','display: flex;width: 800px;justify-content: space-between;position:absolute;');
        
        twoSections[0].setAttribute('style','margin-right:20px;');

        document.body.appendChild(htmlElement);

        // found on stack overflow. handlebar: https://stackoverflow.com/users/4297562/baptwaels?tab=profile bless him :)
        html2canvas(htmlElement).then(canvas => {

            let pdf = new jsPDF('p', 'pt', 'a4');

            for (var i = 0; i <= htmlElement.clientHeight / 980; i++) {
                //! This is all just html2canvas stuff
                var srcImg = canvas;
                var sX = 0;
                var sY = 980 * i; // start 980 pixels down for every new page
                var sWidth = 1250;
                var sHeight = 980;
                var dX = 0;
                var dY = 0;
                var dWidth = 1250;
                var dHeight = 980;

                window.onePageCanvas = document.createElement("canvas");

                onePageCanvas.setAttribute('width', 1250);//
                onePageCanvas.setAttribute('height', 980);//780
                var ctx = onePageCanvas.getContext('2d');
                // details on this usage of this function: 
                // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images#Slicing
                ctx.drawImage(srcImg, sX, sY, sWidth, sHeight, dX, dY, dWidth, dHeight);

                // document.body.appendChild(canvas);
                var canvasDataURL = onePageCanvas.toDataURL("image/png", 1.0);

                var width = onePageCanvas.width;
                var height = onePageCanvas.clientHeight;

                //! If we're on anything other than the first page,
                // add another page
                if (i > 0) {
                    pdf.addPage(612, 791); //8.5" x 11" in pts (in*72)
                }
                //! now we declare that we're working on that page
                pdf.setPage(i + 1);
                //! now we add content to that page!
                pdf.addImage(canvasDataURL, 'PNG', 20, 40, (width * .62), (height * .62));

            }
            //! after the for loop is finished running, we save the pdf.
            pdf.save('cost pools.pdf');
            htmlElement.remove();


        });

    });

})($, jsPDF, html2canvas);