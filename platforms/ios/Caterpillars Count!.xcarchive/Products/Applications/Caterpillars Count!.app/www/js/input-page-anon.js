/*This file includes all logic for populating SURVEY table. It does not include any logic for survey sumbission */

var DOMAIN = "http://develop-caterpillars.vipapps.unc.edu";

var leafPhotoTaken = false;

//Tracks whether a photo was taken for the arthropod submission
//Reset after each arthropod is saved
var arthropodPhotoTaken = false;

//Track whether circle count for selected site has been retrieved.
var circleCountRetrieved = false;

var temperature;
var time;
var date;
var dateTime;
var siteID = -1; //hardcoded for anonymous mode
var sitePassword;
var surveyType;
var circle = -1;
var survey;
var plantSpecies;
var leafCount;
var herbivoryValue;
var selectedOrderText;
var length;
var count;
var notes;
var hairyOrSpinyVal;
var leafRollVal;
var silkTentVal;
var leafImageURI;
var ArthropodsImageURI;
var numberOfArthropodsToSubmit;
var numberOfArthropodsSubmitted;

//Tracks which screen is currently being displayed
var onArthropodPage = false;
var timestart;
var edit = false;

var temperatures = {
	"<30" : {min : - 10, max : 30},
	"30-39": {min : 30, max : 39},
	"40-49": {min : 40, max : 49},
	"50-59": {min : 50, max : 59},
	"60-69": {min : 60, max : 69},
	"70-79": {min : 70, max : 79},
	"80-89": {min : 80, max : 89},
	"90-99": {min : 90, max : 99},
	"100-109": {min : 100, max : 109 },
	">109": {min : 110, max : 130}
};

//Dropdown plugin data for herbivory list
var ddData = [
	{
		value: 0,
		selected: false,
		imageSrc: "pictures/none.png"
	},
	{

		value: 1,
		selected: false,
		imageSrc: "pictures/trace.png"
	},
	{
		value: 2,
		selected: false,
		imageSrc: "pictures/light.png"
	},
	{
		value: 3,
		selected: false,
		imageSrc: "pictures/moderate.png"
	},
	{
		value: 4,
		selected: false,
		imageSrc: "pictures/heavy.png"
	}
];
var db;
document.addEventListener("deviceready", onDeviceReady, false);
//Return to start screen if android back button is pressed
function onDeviceReady(){

	populateCircleList(12);
	db=window.sqlitePlugin.openDatabase(
        {name: 'app.db', location: 'default'}, 
        DBSuccessCB(), 
        function(error){alert("Error Open Database:"+JSON.stringify(error));}
    );
    function DBSuccessCB(){
        alert("DB open OK");
            //retrive site data from server
        
        //retrive sites with permission
        
    };
	//alert("begin wait");
	setInterval(retrieveSiteList(),500);

	document.addEventListener("backbutton", function(e){
		e.preventDefault();
		//If displaying arthropod screen, return to main select screen
		if(onArthropodPage){
			returnToMainSelectScreen();
		}
		//Otherwise ask if the user wants to exit the app
	}, false);

	timestart = getURLparameter("time");
	timeStart=getURLParameter("time");
	alert(timeStart);
	if(!(timeStart===null)){
		edit=true;
		var retrivedRow;
		db.transaction(function(tx){
			tx.executeSql('select distinct type, siteID, userID, password, circle, survey, timeStart, '  +
			'temperatureMin, temperatureMax, siteNotes, plantSpecies, herbivory, surveyType, leafCount,' +
			'source, selectedOrderText, length, count, notes, hairOrSpinyVal, leafRollVal, silkTentVal,' +
			'leafImageURI '+ 'from SURVEY where timeStart=?', [timeStart], function(tx, rs){
            	if(rs.rows.length>0) {retrivedRow=rs.rows.item(0);}
            	else{alert("Did not get indicated survey");}
        	});

    	}, function(error){
        	alert("Transaction error: "+error.message);
    	}, function(){
			populateCircleList(12);
			var temp_range=retrivedRow.temperatureMin+'-'+retrivedRow.temperatureMax;
			if(retrivedRow.temperatureMax==30){
				temp_range='<30';
			}else if(retrivedRow.temperatureMax==130){
				temp_range='>109';
			}
			$("#temperature").val(temp_range);
			$("#circle").val(retrivedRow.circle);
			var dateString=timeStart.split(' ')[0];
			var timeString=timeStart.split(' ')[1];
			$("#date").val(dateString);
			$("#time").val(timeString);
			$(".plant-species").val(retrivedRow.plantSpecies);
			$("#survey").val(retrivedRow.survey);
			$(".notes").val(retrivedRow.siteNotes);
			$(".survey-type").val(retrivedRow.surveyType);
			$(".leaf-count").val(retrivedRow.leafCount);
			//alert(retrivedRow.herbivory);
			$("#herbivory-select").ddslick('select', {index: retrivedRow.herbivory });;
			if(retrivedRow.leafImageURI!=''){
				$("#leaf-capture").html("<img onclick = 'leafCapture()' id='leaf-photo' height = '200' width ='200'>");
				$("#leaf-photo").prop("src", retrivedRow.leafImageURI);
			}	
		});

	}else{
		setTime();
	}
}

function setTime(){
		//Set initial value of time and date fields
		setDateAndTime();
		//Updates time every second
		window.setInterval(setDateAndTime, 1000);
}

//Function called if the user confirms to exit the app
function onConfirmQuit(button){
	if(button == "1"){
		navigator.app.exitApp();
	}
}


$( document ).ready(function() {
	$('#herbivory-select').ddslick({
		data: ddData,
		width: 300,
		imagePosition: "left",
		selectText: "Please select an herbivory score.",
		onSelected: function (data) {
			//Sets value of herbivory-select to herbivory score
			$("#herbivory-select").val(data.selectedIndex)
		}
	});
});


//Populates circle list with number of circles from newly selected site
var populateCircleList = function(numCircles){
	var circleList = document.getElementById("circle");
	for (var i = 1; i <= numCircles; i++) {
		var circleOption = document.createElement("option");
		circleOption.value = i;
		circleOption.text = i;
		circleList.add(circleOption);
	}
};

//Clears circle list before populating with circles from newly selected site
var clearCircleList = function(){
	var circleList = document.getElementById("circle");
	//Make sure to not remove default option
	while(circleList.length > 1){
		circleList.remove(circleList.length-1);
	}
};

//Toggles visiblity of password
var togglePassword = function(){
	var showPasswordCheckboxIsChecked = document.getElementById("show-password").checked;
	var visiblePassword = document.getElementById("visible-password");
	var hiddenPassword = document.getElementById("hidden-password");
	//Display visible password field after copying value from hidden password field
	if(showPasswordCheckboxIsChecked){
		visiblePassword.value = hiddenPassword.value;
		visiblePassword.style.display = "inline-block";
		hiddenPassword.style.display = "none";
	}
	//Display hidden password field after copying value from visible password field
	else{
		hiddenPassword.value = visiblePassword.value;
		hiddenPassword.style.display = "inline-block";
		visiblePassword.style.display = "none";
	}
};

//Function called when an arthropod photo is successfully taken
//Replaces capture "button" with the photo that was taken
var onSuccessArthropod = function(imageData) {
	console.log('success');
	$("#arthropod-capture").html("<img onclick='arthropodCapture()' id='arthropod-photo' height = '200' width ='200'>");
	$("#arthropod-photo").attr("src", imageData);
	console.log(imageData);
	arthropodPhotoTaken = true;
};

//Function called when a leaf photo is successfully taken
//Replaces capture "button" with the photo that was taken
var onSuccessLeaf = function(imageData) {
	console.log('success');
	$("#leaf-capture").html("<img onclick = 'leafCapture()' id='leaf-photo' height = '200' width ='200'>");
	$("#leaf-photo").attr("src", imageData);
	console.log(imageData);
	leafPhotoTaken = true;
};

//Function called when arthropod capture button is clicked
var arthropodCapture = function(){
	navigator.camera.getPicture(onSuccessArthropod, onFail, {
		quality: 50,
		sourceType: Camera.PictureSourceType.CAMERA,
		destinationType: Camera.DestinationType.FILE_URI
	});
};

//Function called when leaf capture button is clicked
var leafCapture = function(){
	navigator.camera.getPicture(onSuccessLeaf, onFail, {
		quality: 50,
		sourceType: Camera.PictureSourceType.CAMERA,
		destinationType: Camera.DestinationType.FILE_URI
	});
};

//Function called when camera is closed without taking a picture
var onFail = function(message) {
	//navigator.notification.alert('Failed because: ' + message);
};

//Sets date and time input fields to the present values.
var setDateAndTime = function(){
	var dateObject = new Date();
	var month = dateObject.getMonth() + 1;//Month is 0-indexed
	if(month < 10){
		month = "0"+month;//Concatenate 0 when value is single digit
	}
	var date = dateObject.getDate();
	if(date < 10){
		date = "0"+date;//Concatenate 0 when value is single digit
	}
	var year = dateObject.getFullYear();
	var dateString = year+"-"+month+"-"+date;

	var hours = dateObject.getHours();
	if(hours < 10){
		hours = "0"+hours;//Concatenate 0 when value is single digit
	}
	var minutes = dateObject.getMinutes();
	if(minutes < 10){
		minutes = "0"+minutes;//Concatenate 0 when value is single digit
	}
	var seconds = dateObject.getSeconds();
	if(seconds < 10){
		seconds = "0"+seconds;//Concatenate 0 when value is single digit
	}
	var timeString = hours+":"+minutes+":"+seconds;
	$("#date").val(dateString);
	$("#time").val(timeString);
};

//Hides main select screen and displays arthropod selection screen
var showArthropodSelectScreen = function( ) {
	onArthropodPage = true;
	$(".main-select-screen").css("display", "none");
	$(".arthropod-order-select-screen").css("display", "initial");
	$(".back-button").css("display", "initial");
};

//Function called when returning to main screen from arthopod selection screen
//Resets any input fields that may have been set
//and restores original html.
var returnToMainSelectScreen = function( ) {
	onArthropodPage = false;
	//Restore inner html of capture button
	$("#arthropod-capture").html("<div class='capture white-text' onclick='arthropodCapture()'><div class = 'capture-text'>CAPTURE</div></div>");

	//Reset input fields
	$("[name='Length']").val("");
	$("[name='Count']").val("");
	$("[name='Notes']").val("");
	document.getElementById("hairyOrSpiny").checked = false;
	document.getElementById("notHairyOrSpiny").checked = false;
	document.getElementById("leafRoll").checked = false;
	document.getElementById("notLeafRoll").checked = false;
	document.getElementById("silkTent").checked =false;
	document.getElementById("notSilkTent").checked =false;
	$(".order-selection").val('default');

	$(".main-select-screen").css("display", "initial");
	$(".arthropod-order-select-screen").css("display", "none");
	$(".back-button").css("display", "none");
	$(".caterpillar-checklist").css("display","none");
};
//Function to save arthropod data. Checks for valid values before saving
var saveArthropod = function( ) {

	var selectedOrder = $(".order-selection").val( );
	selectedOrderText = $(".order-selection option:selected").text();
	//if ( selectedOrder === "trueBugs" || selectedOrder === "other" || selectedOrder === "unidentified" ) {
	if (selectedOrder === "other" || selectedOrder === "unidentified" ) {
		selectedOrder = "empty";
	}

	length = $("[name='Length']").val( );
	count = $("[name='Count']").val( );
	notes = $("[name='Notes']").val( );

	var hairyOrSpiny = $('input[name="hairyOrSpiny"]:checked');
	var leafRoll = $('input[name="leafRoll"]:checked');
	var silkTent = $('input[name="silkTent"]:checked');

	hairyOrSpinyVal = parseInt(hairyOrSpiny.val());
	leafRollVal = parseInt(leafRoll.val());
	silkTentVal = parseInt(silkTent.val());

	var imageSrc;
	if(arthropodPhotoTaken){
		imageSrc = document.getElementById("arthropod-photo").src;
	}

	var lengthIntVal = parseInt(length);
	var countIntVal = parseInt(count);

	if ( selectedOrder === null || selectedOrder === 'default') {
		navigator.notification.alert("Please select an order");
	} else if ( length === "" || lengthIntVal <= 0 || lengthIntVal > 300 ) {
		navigator.notification.alert("Please enter a valid length.");
	} else if ( count === "" || countIntVal <= 0 || countIntVal > 1000) {
		navigator.notification.alert("Please enter a valid count.");
	} else if ( selectedOrder === "empty" && !notes) {//Require notes for unidentified or unknown
		navigator.notification.alert("Please describe the arthropod.");
	} else if ( selectedOrder === "caterpillar" && hairyOrSpiny.length <= 0) {//Require selection for radio buttons
		navigator.notification.alert("Please specify whether the caterpillar was excessively hairy or spiny.");
	} else if ( selectedOrder === "caterpillar" && leafRoll.length <= 0) {//Require selection for radio buttons
		navigator.notification.alert("Please specify whether the caterpillar was found within a rolled up leaf.");
	} else if ( selectedOrder === "caterpillar" && silkTent.length <= 0) {//Require selection for radio buttons
		navigator.notification.alert("Please specify whether the caterpillar was in a large silk tent covering multiple leaves or twigs.");
	} else {

		returnToMainSelectScreen( );
		var arthropodInputHtml;
		//If user took photo, use that photo instead of stock image
		if(arthropodPhotoTaken){
			arthropodInputHtml = "<div class='arthropod-input'>"
					+ "<span class='glyphicon glyphicon-remove' onclick='function(){$(this).parent().remove();}'></span>"
					+ "<h4>" + selectedOrderText + "</h4>"
					+ "<div><img class = 'saved-arthropod-image' src='" + imageSrc +  "' height='50' width='50'></div>"
					+ "<div>"
					+ "<div>Length: <span class='arthropod-length'>" + length + "</span></div>"
					+ "<div>Count: <span class='arthropod-count'>" + count + "</span></div>"
					+ "<div>Notes: <span class='arthropod-notes'>" + notes + "</span></div>";
			arthropodPhotoTaken = false;
		}
		//Else use default image
		else{
			arthropodInputHtml = "<div class='arthropod-input'>"
					+ "<span class='glyphicon glyphicon-remove' onclick='$(this).parent().remove();'></span>"
					+ "<h4>" + selectedOrderText + "</h4>"
					+ "<div><img src='pictures/" + selectedOrder + ".png' height='50' width='50'></div>"
					+ "<div>"
					+ "<div>Length: <span class='arthropod-length'>" + length + "</span></div>"
					+ "<div>Count: <span class='arthropod-count'>" + count + "</span></div>"
					+ "<div>Notes: <span class='arthropod-notes'>" + notes + "</span></div>";
		}
		//If order is not caterpillar, close divs
		if(selectedOrder !== "caterpillar") {
			$(".arthropod-order-information").append(
					arthropodInputHtml
					+ "</div>"
					+ "</div>"
			);
		}
		else{//Else add caterpillar extras then close divs.
			$(".arthropod-order-information").append(
					arthropodInputHtml
					+ "<div>Hairy or spiny: <span class='hairy-or-spiny'>" + Boolean(hairyOrSpinyVal) + "</span></div>"
					+ "<div>Leaf roll: <span class='leaf-roll'>" + Boolean(leafRollVal) + "</span></div>"
					+ "<div>Silk tent: <span class='silk-tent'>" + Boolean(silkTentVal) + "</span></div>"
					+ "</div>"
					+ "</div>"
			);
		}
		//Original arthropod save
		//$(".arthropod-order-information").append(
		//		"<div class='arthropod-input'>"
		//		+ "<h4>" + $(".order-selection option:selected").text() + "</h4>"
		//		+ "<div><img src='pictures/" + selectedOrder + ".png' height='50' width='50'></div>"
		//		+ "<div>"
		//		+ "<div>Length: <span class='arthropod-length'>" + length + "</span></div>"
		//		+ "<div>Count: <span class='arthropod-count'>" + count + "</span></div>"
		//		+ "<div>Notes: <span class='arthropod-notes'>" + notes + "</span></div>"
		//		+ "</div>"
		//		+ "</div>"
		//);

	}
	submitArthropodsToDB(time,selectedOrder,length,count,notes);
};

var submit = function( ) {
	//Check that a temperature has been selected
	alert("temp");
	temperature = $("#temperature option:selected").val();
	if(temperature.localeCompare("default") === 0){
		navigator.notification.alert("Please select a temperature range");
		return;
	}
	//Check that date and time have been entered
	time = document.getElementById("time").value;
	if(!time){
		navigator.notification.alert("Please enter a time.");
		return;
	}
	date = document.getElementById("date").value;
	if(!date){
		navigator.notification.alert("Please enter a date.");
		return;
	}


	dateTime = date + " " + time;//Default seconds value to 00

	//if(oneline == true){
	 //var showPasswordCheckboxIsChecked = document.getElementById("show-password").checked;
	 //if(showPasswordCheckboxIsChecked){
	//	sitePassword = $("#visible-password").val();
	 //}else{
	//	sitePassword = $("#hidden-password").val();
	 //}
	 //if(!sitePassword){
	//	navigator.notification.alert("Please enter the site password");
	//	return;
	 //}
	//}

	surveyType = $(".survey-type option:selected").val();
	if(surveyType.localeCompare("default")===0){
		navigator.notification.alert("Please select a survey type.");
		return;
	}
    //hanging here
	/*if(circle.localeCompare("default")===0){
		navigator.notification.alert("Please select a circle.");
		return;
	} */

	survey = $("#survey option:selected").val();
	alert("survey option retrieved");
	if(survey.localeCompare("default")===0){
		navigator.notification.alert("Please select a survey.");
		return;
	}

	//Trims leading and trailing white space from plant species field input
	plantSpecies = $.trim($(".plant-species").val());
	if(plantSpecies.length <= 0){
		navigator.notification.alert("Please enter a plant species.");
		return;
	}
	//Truncate plantSpecies that are more than 100 characters
	else if(plantSpecies.length > 100){
		plantSpecies = plantSpecies.substring(0, 100);
	}

	leafCount = $(".leaf-count").val();
	if ( leafCount === "" || leafCount < 0 || leafCount > 200){
		navigator.notification.alert("Please enter a leaf count between 0 and 200");
		return;
	}

	switch ($("#herbivory-select").val()){
		case "0":
			herbivoryValue = 0;
			break;
		case "1":
			herbivoryValue = 1;
			break;
		case "2":
			herbivoryValue = 2;
			break;
		case "3":
			herbivoryValue = 3;
			break;
		case "4":
			herbivoryValue = 4;
			break;
		default :
			navigator.notification.alert("Please select an herbivory score.");
			return;
	}
	// alert("herbivory select finished");

	//if(!leafPhotoTaken){
	//	navigator.notification.alert("Please take a leaf photo.");
	//	return;
	//}
	//else{
	//	leafImageURI = $("#leaf-photo").prop("src");
	//}
	//Check validity of site password
	//Attempt to submit survey if password is valid
	//navigator.notification.alert("SiteID: " + siteID +
	//	"\nSite password: " +sitePassword);
	//var online = navigator.onLine;
	
	//submitArthropodsToDB(dateTime);
	// alert("I am here");
	db.transaction(function(tx){
    	tx.executeSql("INSERT INTO SURVEY VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", 
        	['survey',
            siteID,
            "", // userid set to empty string for anonymous mode
            "", // password ''                                ''
            circle,
            survey,
            dateTime,
            temperatures[temperature].min,
            temperatures[temperature].max,
            $(".notes").val(),
            plantSpecies,
            herbivoryValue,
            surveyType,
            parseInt(leafCount),
            "Mobile",
			leafImageURI,
			0]);
    },function(error){
    		alert("Transaction Error: "+error.message);
    },function(){
		alert("This page was successfully stored");
		db.transaction(function(tx){
        	tx.executeSql("DELETE from SURVEY where timeStart=?", [timestart]);
        },function(error){
        	alert("Transaction error: "+error.message);
        },function(){
        	//alert("Successfully delete this survey");
        });
	window.location = "homepage-anon.html";

	});
			
	

};

//Toggles whether the caterpillar checklist is visible on the arthropod select screen
//based on the selected order.
var caterpillarSelected = function(){
	var selectedOrder = $("#order-selection option:selected").val();
	if(selectedOrder.localeCompare("caterpillar") == 0){
		$(".caterpillar-checklist").css("display","inline-block");
	}
	else{
		$(".caterpillar-checklist").css("display","none");
	}
};

//Toggles whether leaf count can be edited based on survey type
var editableLeafCount = function(){
	var surveyType = $(".survey-type option:selected").val();
	var leafCount = $(".leaf-count");
	if(surveyType.localeCompare("Beat_Sheet") == 0){
		leafCount.prop("readOnly", false);
		leafCount.val(null);
	}
	else{
		leafCount.prop("readOnly", true);
		leafCount.val(50);
	}
};

//Displays appropriate tooltip based on which "?" button is clicked
var toolTip = function(toolTipLocation){
	if(toolTipLocation.localeCompare("site-info") === 0){
		$("#site-info-tooltip").dialog({
			modal: true,
			buttons: {
				"Got it!": function() {
					$( this ).dialog( "close" );
				}
			}
		});
	} else if(toolTipLocation.localeCompare("order-info") === 0){
		$("#order-info-tooltip").dialog({
			modal: true,
			buttons: {
				"Got it!": function() {
					$( this ).dialog( "close" );
				}
			}
		});
	} else if(toolTipLocation.localeCompare("plant-info") === 0){
		$("#plant-info-tooltip").dialog({
			modal: true,
			buttons: {
				"Got it!": function() {
					$( this ).dialog( "close" );
				}
			}
		});
	}else if(toolTipLocation.localeCompare("leaf-photo") === 0){
		$("#leaf-photo-tooltip").dialog({
			width: "auto",
			modal: true,
			buttons: {
				"Got it!": function() {
					$( this ).dialog( "close" );
				}
			}
		});
	}
};

var submitArthropodsToDB = function(time,selectedOrder,length,count,notes){
	var arthropodInputs = $(".arthropod-input");
	numberOfArthropodsToSubmit = arthropodInputs.length;
	numberOfArthropodsSubmitted = 0;

			//Get values of caterpillar checklist
			var hairyOrSpiny, leafRoll, silkTent;
			if ($(".hairy-or-spiny", this).text().localeCompare("true") === 0) {
				hairyOrSpiny = 1;
			}
			else {
				hairyOrSpiny = 0;
			}
			if ($(".leaf-roll", this).text().localeCompare("true") === 0) {
				leafRoll = 1;
			}
			else {
				leafRoll = 0;
			}
			if ($(".silk-tent", this).text().localeCompare("true") === 0) {
				silkTent = 1;
			}
			else {
				silkTent = 0;
			}

			var arthropodImageURI = $(".saved-arthropod-image", this).prop("src");
			//navigator.notification.alert("Arthropod image uri: " + arthropodImageURI);
           db.transaction(function(tx){
                        tx.executeSql("INSERT INTO ARTHROPODS VALUES (?,?,?,?,?,?,?,?,?,?,?)", 
                        	[selectedOrder,
                        	length,
                        	notes,
                        	count,
                        	hairyOrSpiny,
                        	leafRoll,
                        	silkTent,
							arthropodImageURI,
							siteID,
							circle,
							survey]);
                    }  , function(error){
                        alert("Transaction Error: "+error.message);
                    },function(){
						//alert(selectedOrder);
						//alert(length);
						//alert(count);
                     });



		navigator.notification.alert("Successfully stored Arthropod data!");
		//clearFields();
	
};

//databaseID = surveyID if leaf photo, orderID if arthropod photo
//Form is cleared if final arthropod photo is successfully uploaded
//Uploads photo using FileTransfer plugin.
function uploadPhoto(photoURI, photoType, databaseID){
	// !! Assumes variable fileURL contains a valid URL to a text file on the device,
	//    for example, cdvfile://localhost/persistent/path/to/file.txt

	var leafSuccess = function (r) {
		//navigator.notification.alert("leaf photo uploaded");
		console.log("Code = " + r.responseCode);
		console.log("Response = " + r.response);
		console.log("Sent = " + r.bytesSent);
	};

	var fail = function (error) {
		navigator.notification.alert("An error has occurred: Code = " + error.code);
		console.log("upload error source " + error.source);
		console.log("upload error target " + error.target);
	};

	var arthropodSuccess = function(r){
		//navigator.notification.alert("order photo uploaded");

		//Increment number of arthropods submitted
		//here when there is a photo to upload
		//to prevent duplicate success alerts
		numberOfArthropodsSubmitted++;
		console.log("Code = " + r.responseCode);
		console.log("Response = " + r.response);
		console.log("Sent = " + r.bytesSent);

		//If this was the last order photo to submit, clear form, submission succeeded
		if(numberOfArthropodsSubmitted == numberOfArthropodsToSubmit) {
			navigator.notification.alert("Successfully submitted survey data!");
			clearFields();

		}
	};

	var options = new FileUploadOptions();
	//options.fileKey = "file";
	//options.fileName = photoURI.substr(photoURI.lastIndexOf('/') + 1);

	//var params = {};
	//params.value1 = "test";
	//params.value2 = "param";
	//
	//options.params = params;

	var ft = new FileTransfer();
	//If uploading leaf photo
	if(photoType.localeCompare("leaf-photo") === 0) {
		options.fileName = "survey_" + databaseID + "_leaf_photo.jpg";
		ft.upload(photoURI, encodeURI(DOMAIN + "/api/uploads.php?surveyID=" + databaseID), leafSuccess, fail, options);
	}
	//Uploading arthropod photo
	else if(photoType.localeCompare("arthropod-photo") === 0){
		options.fileName = "order_" + databaseID + "_arthropod_photo.jpg";
		ft.upload(photoURI, encodeURI(DOMAIN + "/api/uploads.php?orderID=" + databaseID), arthropodSuccess, fail, options);
	}
}


//Clears fields following a successful survey submission
var clearFields = function(){
	$(".time-start").val("");
	$(".notes").val("");

	$(".plant-species").val("");
	//Clear leaf count only for beat sheet
	var surveyType = $(".survey-type option:selected").val();
	if(surveyType.localeCompare("Beat_Sheet") == 0) {
		$(".leaf-count").val("");
	}
	setDateAndTime();
	document.getElementById("circle").selectedIndex = 0;
	document.getElementById("survey").selectedIndex = 0;

	//Destroy then recreate dropdown to restore to default value
	$('#herbivory-select').ddslick('destroy');
	$('#herbivory-select').ddslick({
		data: ddData,
		width: 300,
		imagePosition: "left",
		selectText: "Please select an herbivory score.",
		onSelected: function (data) {
			//Sets value of herbivory-select to herbivory score
			$('#herbivory-select').val(data.selectedIndex)
		}
	});
	$("#leaf-capture").html("<div class='capture white-text' onclick='leafCapture()'><div class = 'capture-text'>CAPTURE</div></div>");

	$(".arthropod-input").each(function(){$(this).remove();});
};

//Handles device rotation
window.shouldRotateToOrientation = function() {
	return true;
};
