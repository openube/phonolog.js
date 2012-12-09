$(function () {

  var data = []
  var fileSystem = null
  var audioPath = 'audio/user/'
  
  var audioBuffer;
  var sourceNode;
  var splitter;
  var analyser, analyser2;
  var javascriptNode;
  var context;

  // FILE SYSTEM STUFF

  // Creating the file system
  window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
  
  //window.requestFileSystem(window.TEMPORARY, 5*1024*1024 /*5MB*/, onInitFs, errorHandler);

  window.webkitStorageInfo.requestQuota(PERSISTENT, 5*1024*1024, function(grantedBytes) {
    window.requestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
  }, function(e) {
    console.log('Error', e);
  });

  function onInitFs(fs) {
    console.log('Opened file system: ' + fs.name);
    fileSystem = fs;
  }


  // FILE CRUD
  function createFile(){
      var fileName = document.getElementById('createInput').value;

      fileSystem.root.getFile(fileName, {create: true, exclusive: true}, function(fileEntry) {

    // fileEntry.isFile === true
    // fileEntry.name == 'log.txt'
    // fileEntry.fullPath == '/log.txt'
    console.log(fileName + " created successfully!")
    }, errorHandler);
  }

  function readFile(){
    var fileName = document.getElementById('readFileInput').value;

    fileSystem.root.getFile(fileName, {}, function(fileEntry) {

    // Get a File object representing the file,
    // then use FileReader to read its contents.
    fileEntry.file(function(file) {
       var reader = new FileReader();

       reader.onloadend = function(e) {
         var txtArea = document.createElement('textarea');
         txtArea.value = this.result;
         document.body.appendChild(txtArea);
       };
       data.push(window.webkitURL.createObjectURL(file))
       //reader.readAsText(file);
    }, errorHandler);

    }, errorHandler);
    console.log(fileName + " read successfully!")
  }

  function writeToFile(){

    var fileName = document.getElementById('writeFileName').value;
    var addition = document.getElementById('writeInput').value;

    fileSystem.root.getFile(fileName, {create: false}, function(fileEntry) {

    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(function(fileWriter) {

      fileWriter.seek(fileWriter.length); // Start write position at EOF.

      // Create a new Blob and write it to log.txt.
      var blob = new Blob([addition], {type: 'text/plain'});

      fileWriter.write(blob);

    console.log("Wrote " + addition + " to " + fileName);
    }, errorHandler);

    }, errorHandler);

  }

  function deleteFile(){

    var fileName = document.getElementById('deleteInput').value;

    fs.root.getFile(fileName, {create: false}, function(fileEntry) {

      fileEntry.remove(function() {
         console.log(fileName + ' removed.');
      }, errorHandler);

      }, errorHandler);
    }

  function uploadFiles(files){
   // Duplicate each file the user selected to the app's fs.
      for (var i = 0, file; file = files[i]; ++i) {

        // Capture current iteration's file in local scope for the getFile() callback.
        (function(f) {
          fileSystem.root.getFile(f.name, {create: true, exclusive: true}, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
              fileWriter.write(f); // Note: write() can take a File or Blob object.
              console.log("Uploaded " + f.name + " to the file system.")
            }, errorHandler);
          }, errorHandler);
        })(file);
      }
  };

  // Directory CRUD
  function createDir(rootDirEntry, folders) {
  // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
  if (folders[0] == '.' || folders[0] == '') {
    folders = folders.slice(1);
  }
  rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {
    // Recursively add the new subfolder (if we still have another to create).
    if (folders.length) {
      createDir(dirEntry, folders.slice(1));
    }
  }, errorHandler);
};

  $("a#createFile").click(function (e){
    createFile();
  });

  $("a#readFile").click(function (e){
    readFile();
  });

  $("a#writeFile").click(function (e){
    writeToFile();
  })

  $("a#deleteFile").click(function (e){
    deleteFile();
  })

  document.querySelector('#myfile').onchange = function(e) {
    var files = this.files;
    uploadFiles(files);
  }

  function errorHandler(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };

  console.log('Error: ' + msg);
}

  // RECORDER STUFF
  var startRecorder = function(recorder) {
    recorder.clear();
    recorder.record();

    $("a#record-toggle").text("Click to stop recording...");
  }

  var stopRecorder = function(recorder) {
    recorder.stop();
    $("a#record-toggle").text("Click me to re-record.");

    recorder.exportWAV(function(wav) {
      var url = window.webkitURL.createObjectURL(wav);
      data.push(url)
    });
  }

  var playbackRecorderAudio = function (recorder, context) {
    recorder.getBuffer(function (buffer) {
      var source = context.createBufferSource();
      source.buffer = context.createBuffer(1, buffer.length, 88200);
      source.buffer.getChannelData(0).set(buffer);
      source.connect(context.destination);
      source.noteOn(0);
    });
  }

function setupAudioNodes() {

        // setup a javascript node
        javascriptNode = context.createJavaScriptNode(2048, 1, 1);
        // connect to destination, else it isn't called
        javascriptNode.connect(context.destination);


        // setup a analyzer
        analyser = context.createAnalyser();
        analyser.smoothingTimeConstant = 0.3;
        analyser.fftSize = 1024;

        console.log("Analyser", analyser)

        // create a buffer source node
        sourceNode = context.createBufferSource();
        splitter = context.createChannelSplitter();

        // connect the source to the analyser and the splitter
        sourceNode.connect(splitter);

        // connect one of the outputs from the splitter to
        // the analyser
        splitter.connect(analyser,0,0);

        // connect the splitter to the javascriptnode
        // we use the javascript node to draw at a
        // specific interval.
        analyser.connect(javascriptNode);

        splitter.connect(context.destination,0,0);

        // and connect to destination
        sourceNode.connect(context.destination);
    }
    
  function getAverageVolume(array) {
        var values = 0;
        var average;

        var length = array.length;

        // get all the frequency amplitudes
        for (var i = 0; i < length; i++) {
            values += array[i];
        }

        average = values / length;
        return average;
    }

  navigator.webkitGetUserMedia({"audio": true}, function(stream) {

    $("#shown").toggle();
    $("#hidden").toggle();

    context = new webkitAudioContext();
    var mediaStreamSource = context.createMediaStreamSource( stream );

    setupAudioNodes();

    //mediaStreamSource.connect( context.destination );

    var recorder = new Recorder(mediaStreamSource);
    var recording = false;

    $("a#record-toggle").click(function (e) {

      e.preventDefault();
      if (recording === false) {
        startRecorder(recorder);
        recording = true;
      }
      else {
        stopRecorder(recorder);
        recording = false;
      }

    });

    javascriptNode.onaudioprocess = function() {

        // get the average for the first channel
        var array =  new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);

        //console.log(array)

        var average = getAverageVolume(array);

        //console.log(average)
    }


    $("a#1").click(function (e){
      console.log(data)
      $("audio#recorded-audio").attr("src", data[0]);
      $("audio#recorded-audio").get()[0].load();
    })

    $("a#2").click(function (e){
      console.log(data)
      //console.log($("audio#recorded-audio").get()[0].duration)

      $("audio#recorded-audio").attr("src", data[1]);
      $("audio#recorded-audio").get()[0].load();
    })

    $("a#3").click(function (e){
      $("audio#recorded-audio").attr("src", data[2]);
      $("audio#recorded-audio").get()[0].load();
    })

    $("a#4").click(function (e){
      $("audio#recorded-audio").attr("src", data[3]);
      $("audio#recorded-audio").get()[0].load();
    })


    $("a#webaudio-playback").click(function (e) {
      e.preventDefault();
      playbackRecorderAudio(recorder, audioContext);
    })

  }, 

  function(error) {
    $("body").text("Error: you need to allow this sample to use the microphone.")
  });
})