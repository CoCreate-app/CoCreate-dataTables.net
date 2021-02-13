/*!
 * https://cocreate.app
 * https://github.com/CoCreate-app/Realtime-Datatables
 * Released under the MIT license
 * https://github.com/CoCreate-app/Realtime-Datatables/blob/master/LICENSE
 */
var dtOBJs = [];

function initSockets() {
  
  CoCreateSocket.listen('createDocument', function(data) {
    createdDocument(data);
  })
  
  CoCreateSocket.listen('deleteDocument', function(data) {
    deletedDocument(data);
  })
  
  CoCreateSocket.listen('updateDocument', function(data) {
    updateTableData(data);
  })
  
  CoCreateSocket.listen('readDocumentList', function(data) {
    fetchedTableData(data);
  })
}


///////////////////////////////////////////////////////////////////////
function initTables(container) {

  let process_container = container || document;
  if (!process_container.querySelectorAll) {
    return;
  }
  let tables = process_container.querySelectorAll('table[data-table_id]');
  
  if (tables.length == 0 &&  
    process_container != document && 
    process_container.tagName === 'TABLE' && 
    process_container.hasAttribute('data-table_id')) 
    {
      tables = [process_container];
    } 
  
  
  for (var i=0; i<tables.length; i++) {
    var table = tables[i];
    var dt_id = table.getAttribute('data-table_id');
    if (!dt_id) {
      continue;
    }
    
    let filter = CoCreate.filter.setFilter(table, "data-table_id", "datatable");
    if (!filter) continue;
    
    var tableId = table.id;
    
    if (!tableId || tableId == "") {
      continue;
    }
    
    if (CoCreateInit.getInitialized(table)) {
			continue;
		}
		CoCreateInit.setInitialized(table)

    var availableOrders = getAvailableOrders(tableId);
    
    console.log(availableOrders);
    
    var dataTable = $('#' + tableId).DataTable({
      "colReorder": true,
      "bScrollInfinite": true,
      "bScrollCollapse": true,
      //"sScrollY": '300px',
      "sScrollY": 'calc(100vh - 105px)',
      "scrollX": true,
      "paging": false,
      "searching": false,
      "ordering": false,
      colReorder: true,
      data: [],
      columns: getColumnDef(tableId, null),
      dom: 'Bfrtip',
      buttons: [
        'copyHtml5',
        {
          extend: 'excelHtml5',
          exportOptions: {
            columns: ':visible'
          }
        },
        'csvHtml5',
        {
          extend: 'pdfHtml5',
          download: 'open',
          exportOptions: {
            columns: ':visible'
          }
        },
        'print',
        'colvis',
        ,
        {
          text: 'Show',
          action: function (e, dt, node, config) {
            $('.colvis-menu').toggle()
          }
        }
         
      ]
    });
    
    
    $('#' + tableId).on('click', 'td a', function(event) {
      event.preventDefault();
      CoCreateLogic.setLinkProcess(this);
    })
    
    if (!filter.count) {
      filter.count = 30;
    }
    var dtObj = {
      tableId: tableId,
      dataTable: dataTable,
      collection: filter.collection,
      availableOrders: availableOrders,
      availableMore: true,
      state: 'loaded',
      scrollTop: 0,
      filter: filter
    }
    

    dtOBJs.push(dtObj);
    
    
    initializeShowHide(dtObj);

    initializeTableOrder(dtObj);
    initializeDTScroll(dtObj);
    
    if (table.classList.contains('dt-selectable')) initializeSelectableDT(dtObj);
    
    table.addEventListener("changeFilterInput", function(e) {
      initializeDatatable(dtObj);
      fetchTableData(dtObj);
    })
    
    fetchTableData(dtObj);
  }
}


function fetchTableData(dtObj) {
  if (!dtObj.availableMore || dtObj.state == 'loading') return;
  
  CoCreate.filter.fetchData(dtObj.filter);
  dtObj.state = 'loading';
}

function fetchedTableData(data) {
  console.log(data);
  var tableId = data['element'];
  
  var dtObj = CoCreate.filter.getObjectByFilterId(dtOBJs, tableId);
  
  if (!dtObj) return;
  const result_data = data['data'];
  
  if (result_data.length > 0) {
    result_data.forEach(function(doc) {
      dtObj.dataTable.row.add(doc).draw(false);
    })
    
    var scrollBody = $("#" + dtObj.tableId + "_wrapper .dataTables_scrollBody");
    //scrollBody.scrollTop(dtObj.scrollTop);
  }
  
  dtObj.filter.startIndex = dtObj.filter.startIndex + result_data.length;
  if (result_data.length == 0) dtObj.availableMore = false;
  //dtObj.availableMore = data['availableMore'];
  dtObj.state = 'loaded';
}

///////////////////////////////////////////////////////////////

function initializeDatatable(dtObj) {
  dtObj.dataTable.clear().draw(false);
  
  dtObj.filter.startIndex = 0;
  dtObj.availableMore = true;
}

function initializeSelectableDT(dtObj) {
  $('#' + dtObj.tableId + ' tbody').on( 'click', 'tr .selectable', function () {
    $(this).closest('tr').toggleClass('tr-selected');
    
    // alert('select');
  });
}

function initializeShowHide(dtObj) {
  var tableId = dtObj.tableId
  var selector = "[data-table_id='" + tableId + "'].colvis-menu";
  console.log(selector);
	var dropDownMenu = document.querySelector(selector);
	
	if (dropDownMenu) {
    $(dropDownMenu).hide();			
		$('#' + tableId + ' thead th').each(function (i) {
			var title = $(this).text();
			var item = `<li class="dropdown-item">
              <input type="checkbox" data-name="'+ title +'" data-column="`+ i +`" class="toggle-vis" checked>
              <label >&nbsp;`+ title +`</label>
            </li>`
			$(dropDownMenu).append(item);
		});
      $(selector + ' .toggle-vis').on('click', function (e) {
    	//e.preventDefault();
    	// Get the column API object
    	var column = dtObj.dataTable.column($(this).attr('data-column'));
    	// Toggle the visibility
    	column.visible(!column.visible());
      });
  }
}

function initializeTableOrder(dtObj) {
  var tableWrapper = document.querySelector('#' + dtObj.tableId + '_wrapper');
  $(tableWrapper).on('click', 'thead th', function() {
    var index = getIndex(this);
    console.log(index);
    dtObj.filter.orders = getNewOrder(dtObj, index);
    
    console.log(dtObj.orders);
    
    initializeDatatable(dtObj);
    
    fetchTableData(dtObj);
  })
}

function getIndex(child) {
  var i = 0;
  while( (child = child.previousSibling) != null ) 
    i++;
    
  return i;
}

function getNewOrder(dtObj, columnIndex) {
  var newOrderName = dtObj.availableOrders[columnIndex];
  var newOrder;
  var oldOrder = dtObj.filter.orders[0];
  if (oldOrder && oldOrder.name == newOrderName) {
    if (oldOrder.type == -1) {
      newOrder = {
        name: newOrderName,
        type: 1
      };
    } else {
      newOrder = {
        name: newOrderName,
        type: -1
      };
    }
  } else {
    newOrder = {
      name: newOrderName,
      type: -1
    };
  }
  
  return [newOrder];
}

function getAvailableOrders(tableId) {
  var availableOrders = [];
  var template = getTableTemplate(tableId);
  var tds = template.querySelectorAll('td');
  
  for (var i = 0; i < tds.length; i++) {
    var td = tds[i];
    
    var order = '';
    var tags = td.querySelectorAll('h1, h2, h3, h4, h5, h6, p, i, q, a, b, li, span, code');
    
    for (var j = 0; j < tags.length; j++) {
      var tag = tags[j];
      var name = tag.getAttribute('name');
      if (order == '' && name) {
        order = name;  
      }
      
    }
    
    availableOrders.push(order);
  }
  
  return availableOrders;
  
}

function updateTableData(data) {
  
  for (var i=0; i < dtOBJs.length; i++) {
    var dtObj = dtOBJs[i];
    
    if (dtObj.collection == data['collection']) {
      
      ////  update table data;
      
      dtObj.dataTable.rows().every(function () {
        
        var that = this;
        var rowData = this.data();
        var rowId = this.id();
        if (rowData['_id'] == data['document_id']) {
          
          for (var key in data['data']) {
            rowData[key] = data['data'][key];
          }
          
          this.data(rowData).draw(false);
        }
      });  
      
    }
  }
}

function createdDocument(data) {
  const collection = data['collection'];
  const element_id = data['element']

  let created_data = data.data;
  for (var i=0; i < dtOBJs.length; i++) {
    var dtObj = dtOBJs[i];
    
    if (dtObj.collection == collection) {
        dtObj.dataTable.row.add(created_data).draw(false);
        dtObj.filter.startIndex = dtObj.filter.startIndex + 1;
    }
  }

}

function deletedDocument(data) {
  var collection = data['collection'];
  var id = data['document_id'];
  
  for (var i=0; i < dtOBJs.length; i++) {
    var dtObj = dtOBJs[i];
    
    if (dtObj.collection == collection) {
      dtObj.dataTable.rows().every(function () {
      
        var rowData = this.data();

        if (rowData && rowData['_id'] == id) {
          this.remove().draw(false);
          dtObj.filter.startIndex = dtObj.filter.startIndex - 1;
        }
      })
    }
  }
}

function initializeDTScroll(dtObj) {
  var tableId = dtObj.tableId;
  var scrollBody = $("#" + tableId + "_wrapper .dataTables_scrollBody");
  var table = scrollBody.find('#' + tableId);
  
  if (!scrollBody || !table) return;
  
  scrollBody.on('scroll', function() {
    // console.log(table.outerHeight());
    // console.log(scrollBody.height());
    // console.log(scrollBody.scrollTop());
    
    if (Math.abs(table.outerHeight() - scrollBody.height() - scrollBody.scrollTop()) < 3 && scrollBody.scrollTop() != 0) {
      console.log('load more data');
      
      dtObj.scrollTop = scrollBody.scrollTop();
      fetchTableData(dtObj);
    }
  })
}

function getColumnDef(tableId, collection) {
  var columnDef = []
  
  var template = getTableTemplate(tableId);
  
  var tds = template.querySelectorAll('td');
  
  for (var i=0; i<tds.length; i++) {
    var td = tds[i];
    
    var column = getColumn(td, collection);
    
    columnDef.push(column);  
  }
  
  return columnDef;
}

function getIdColumn() {
  var column = new Object();
  column.data = null;
  column.render = function(data, type, row, meta) {
    var res = '<span>' + data['_id'] + '</span>';
    
    return res;
  }
  
  return column;
}

function getColumn(tmp, collection) {
  
  var column = new Object();
  column.className = tmp.getAttribute('class');
  column.data = null;
  column.render = function(data, type, row, meta) {
    
    var td = tmp.cloneNode(true);  
    
    var displayList = td.querySelectorAll('h1, h2, h3, h4, h5, h6, p, i, q, a, b, li, span, code');

    for (var i = 0; i < displayList.length; i++) {
      var display = displayList[i];
      // display.innerHTML = ''
      var name = display.getAttribute('name');
      
      for (var key in data) {
        if (key == name) {
          display.innerHTML = data[key];
        }
      }
   
      
      if (name == 'document_id') {
        display.innerHTML = data['_id'];
      }
      
      if (name == 'created_on' && data['created_on']) {
        var date = new Date(data['created_at']);
        display.innerHTML = date.toISOString();
      }
      
      if (name == 'updated_on' && data['updated_on']) {
        var date = new Date(data['updated_at']);
        display.innerHTML = date.toISOString();
      }
      
      
    }
    
    var aTags = td.querySelectorAll('a');
    
    for (var i=0; i<aTags.length; i++) {
      var aTag = aTags[i];
      
      aTag.setAttribute('data-pass_document_id', data['_id']);
      
      
    }
    
    var avatar = td.querySelector('.named-avatar');
    
    if (avatar) {
      var avatar_name = avatar.getAttribute('data-avatar_name');
      var avatar_image = avatar.getAttribute('data-avatar_image');
      
      var hasAvatarImage = false;
      
      if (avatar_image) {
        for (var key in data) {
          if (key == avatar_image && data[key] != '') {
            var image = document.createElement('img');
            image.src = data[key];
            
            avatar.innerHTML = '';
            avatar.appendChild(image);
            
            hasAvatarImage = true;
          }
        }
    
      }
      
      if (!hasAvatarImage && avatar_name) {
        for (var key in data) {
          if (key == avatar_name) {
            avatar.innerHTML = data[key].substr(0, 1).toUpperCase();
            hasAvatarImage = true;
          }
        }
      
      }
      
    }
    
    return td.innerHTML;
  }
  
  return column;
}

function getTableTemplate(tableId) {
  
  var table = document.getElementById(tableId);
  if (table) {
    var tbody = table.querySelector('tbody');
    var rowTemplate = tbody.querySelector('tr.template');
    
    return rowTemplate;
  } else {
    return false;
  }
}

function initDatatables() {
  var fields_search = '';
  $('#example tfoot th').each(function (i) {
    var title = $(this).text();
    $(".dropdown-menu").append('<li class="dropdown-item">\
                    <input type="checkbox" data-name="'+ title + '" data-column="' + i + '" class="toggle-vis" checked="true">\
                    <label >&nbsp;'+ title + '</label>\
            </li>')
    $(this).html('<input type="text" class="advance_search" placeholder="Search ' + title + '" />');
    //fields_search += '<td><input type="text" class="advance_search d-none" placeholder="Search ' + title + '" /></td>';
  });
  //$('#example tr:first').after('<tr>'+fields_search+'</tr>');
  
  table = $('#example').DataTable({
    "colReorder": true,
    "scrollY": "calc(100vh - 300px)",
    "scrollX": true,
    "paging": false,
    dom: 'Bfrtip',
    buttons: [
      'copyHtml5',
      {
        extend: 'excelHtml5',
        exportOptions: {
          columns: ':visible'
        }
      },
      'csvHtml5',
      {
        extend: 'pdfHtml5',
        download: 'open',
        exportOptions: {
          columns: [ 0, 1, 2, 5, 6 ]
        }
      },
      'print',
      {
        text: 'Search',
        action: function (e, dt, node, config) {
          $(".advance_search").toggleClass('d-none')
        }
      },
      'colvis',
      {
        text: 'Show',
        action: function (e, dt, node, config) {
          $('.dropdown-menu').toggle()
        }
      }
    ]
  });//end datatables
  $(".advance_search").toggleClass('d-none')
  $('.toggle-vis').on('click', function (e) {
    //e.preventDefault();
    // Get the column API object
    var column = table.column($(this).attr('data-column'));
    // Toggle the visibility
    column.visible(!column.visible());
  });//end show columns
  
  // Apply the search
  table.columns().every(function () {
    var that = this;
    $('input',this.footer()).on('keyup change', function () {
      if (that.search() !== this.value) {
        that
          .search(this.value)
          .draw();
      }
    });
  });  
}

function initTableButtons() {

  var btns = document.querySelectorAll('[data-table_id][data-btn_type]');
  
  for (var i=0; i < btns.length; i++) {
    var btn = btns[i];
    
    var type = btn.getAttribute('data-btn_type');
    var tableId = btn.getAttribute('data-table_id');
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      
      var type = this.getAttribute('data-btn_type');
      var tableId = this.getAttribute('data-table_id');
      
      tableBtnClicked(tableId, type);
    })
  }
}

function tableBtnClicked(tableId, type) {
  if (!tableId) return;
  
  for (var i=0; i<dtOBJs.length; i++) {
    var dtObj = dtOBJs[i];
    
    if (dtObj.tableId == tableId) {
      var dataTable = dtObj.dataTable;
      
      switch (type) {
        case 'copy':
          // code
          dataTable.button(0).trigger();      ////   copy button trigger
          break;
        case 'excel':
          // code
          dataTable.button(1).trigger();     ////  excel button trigger
          break;
        case 'csv':
          // code
          dataTable.button(2).trigger();   ///   csv button trigger
          break;
        case 'pdf':
          // code
          dataTable.button(3).trigger();  /// pdf button trigger
          break;
        case 'print':
          // code
          dataTable.button(4).trigger();   ////  print button trigger
          break;
        case 'column-visibility':
          // code
          dataTable.button(6).trigger();   //// column-visibility button trigger
          break;
        case 'delete-rows':
          //code
          deleteSelectedRows(dtObj);
          break;
        default:
          // code
      }
    }
  }
}


function deleteSelectedRows(dtObj) {
  let selectedIds = [];
  
  let selectedData = dtObj.dataTable.rows('.tr-selected').data();
  let length = selectedData.length;
  
  for (let i=0; i<length; i++) {
    selectedIds.push(selectedData[i]['_id']);
    CoCreate.crud.deleteDocument({
      'collection': dtObj.collection,
      'document_id': selectedData[i]['_id'],
      'metadata': '',
    })
  }
}

/** init **/
document.addEventListener("DOMContentLoaded", function () {
  initSockets();
  initTableButtons();
  initTables();
});//end ready

CoCreateInit.register('CoCreateDatatable', window, initTables);

// CoCreate.observer.init({ 
// 	name: 'CoCreateDatatable', 
// 	observe: ['subtree', 'childList'],
// 	include: '[data-table_id]', 
// 	callback: function(mutation) {
// 		initTables(mutation.target)
// 	}
// })
