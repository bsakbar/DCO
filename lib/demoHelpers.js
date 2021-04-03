const demoHelpers = {
     showDialog: (dashboardName, worksheetNames, onButtonClick) => {
        $('#choose_sheet_buttons').empty();
        $('#choose_sheet_title').text(dashboardName);
        worksheetNames.forEach((worksheetName) => {
          const button = demoHelpers.createButton(worksheetName);
          button.click(() => {
            $('#choose_sheet_dialog').modal('toggle');
          onButtonClick(worksheetName);
          });
          $('#choose_sheet_buttons').append(button);
        });
        $('#choose_sheet_dialog').modal('toggle');
      },

    populateDataTable: (marks, onHeaderClick) => {
        const worksheetData = marks.data[0];
        const data = worksheetData.data.map(function(row, index) {
          const rowData = row.map(function(cell) {
              return cell.formattedValue;
          });
          return rowData;
        });
        const columns = worksheetData.columns.map(function(column) {
          return {
            title: column.fieldName
          };
        });
        $('#data_table_wrapper').empty();
        if (data.length > 0) {
            $('#no_data_message').css('display', 'none');
            $('#data_table_wrapper').append(`<table id='data_table' class='table table-striped table-bordered'></table>`);
            var top = $('#data_table_wrapper')[0].getBoundingClientRect().top;
            var height = $(document).height() - top - 130;

            const headerCallback = function(thead, data) {
                const headers = $(thead).find('th');
                for (let i = 0; i < headers.length; i++) {
                    const header = $(headers[i]);
                    if (header.children().length === 0) {
                        const fieldName = header.text();
                        const button = $(`<a href='#'>${fieldName}</a>`);
                        button.click(function() {
                            onHeaderClick(i, fieldName);
                        });

                        header.html(button);
                    }
                }
            };

            // Initialize our data table with what we just gathered
            $('#data_table').DataTable({
                data: data,
                columns: columns,
                autoWidth: false,
                deferRender: true,
                scroller: true,
                scrollY: height,
                scrollX: true,
                headerCallback: headerCallback,
                dom: "<'row'<'col-sm-6'i><'col-sm-6'f>><'row'<'col-sm-12'tr>>" // Do some custom styling
            });
        } else {
            // If we didn't get any rows back, there must be no marks selected
            $('#no_data_message').css('display', 'inline');
        }
      },
    getSelectedSheet: (worksheetName) => {
        return tableau.extensions.dashboardContent.dashboard.worksheets.find(function(sheet) {
            return sheet.name === worksheetName;
        });
      },
      getValuesInColumn: (columnIndex) => {
        const dataTable = $('#data_table').DataTable({
            retrieve: true
        });
        const column = dataTable.column(columnIndex);
        const columnDomain = column.data().toArray().filter(function(value, index, self) {
            return self.indexOf(value) === index;
        });
        return columnDomain;
      },
    createButton: (buttonTitle) => {
        return $(`<button type='button' class='btn btn-default btn-block'>${buttonTitle}</button>`);
      }
}
