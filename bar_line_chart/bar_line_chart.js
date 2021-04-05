'use strict';
(function() {

    let removeEventListener;
    let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function() {
            const savedSheetName = "D3 DATA"
            // const savedSheetName = 'Partner Display Performance'
            loadSelectedMarks(savedSheetName);

        }, function(err) {
            // Something went wrong in initialization.
            console.log('Error while Initializing: ' + err.toString());
        });
    });


    function loadSelectedMarks(worksheetName) {
        if (removeEventListener) {
            removeEventListener();
        }

        const worksheet = demoHelpers.getSelectedSheet(worksheetName);
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
         for (let i=0; i < worksheets.length; i++){
           console.log(worksheets[i].name)
         }
         worksheet.getSummaryDataAsync().then(function(sumdata) {
             const worksheetData = sumdata;
             console.log(worksheetData)


             let newArr = [];
             var dataJson;
             var cols = [];


             worksheetData.columns.map(d => {
                 cols.push(d.fieldName);
             })
             console.log(cols)
             console.log(worksheetData.data)

             worksheetData.data.map(d => {
                 dataJson = {};
                 for (let i = 0; i < cols.length; i++) {
                     if (cols[i].includes("AGG(Conversion Rate)") || cols[i].includes("SUM(Impressions)")) {
                         dataJson[cols[i]] = !isNaN(d[i].value) ? d[i].value : 0;
                     } else {
                         dataJson[cols[i]] = d[i].value;
                     }
                 }


                 if (dataJson['Tactic'] == ['Lookalike'] ||
                     dataJson['Tactic'] == ['Behavioral'] ||
                     dataJson['Tactic'] == ['In Market']) {
                     newArr.push(dataJson);
                 }





             });
             console.log(newArr)

             let sums = {};
             let i;
             for (i = 0; i < newArr.length; i++) {

                 // assign new names to fieldnames
                 var impressions = newArr[i]["SUM(Impressions)"]
                 var conv_rate = newArr[i]["AGG(Conversion Rate)"]
                 var date = newArr[i]["Date"]
                 var tactic = newArr[i]["Tactic"]

                 var tactic_date = tactic + '_' + date

                 if (tactic_date in sums) {
                     sums[tactic_date]['impressions'] += impressions
                     sums[tactic_date]['conv_rate'] += conv_rate



                 } else {
                     sums[tactic_date] = {
                         "impressions": impressions,
                         "conv_rate": conv_rate,
                         "tactic": tactic,
                         "date": date
                     }
                 }
             }


             var sumsArr = []
             for (const [key, value] of Object.entries(sums))
                 sumsArr.push(value)


             sumsArr.sort((a, b) => (a.date > b.date) ? 1 : -1)

          console.log(sumsArr)
             drawDotChart(sumsArr);

         });

        worksheet.getSelectedMarksAsync().then((marks) => {
            demoHelpers.populateDataTable(marks, filterByColumn);
        });

        const marksSelectedEventHandler = (event) => {
            loadSelectedMarks(worksheetName);
        }
        // removeEventListener = worksheet.addEventListener(
        //     tableau.TableauEventType.MarkSelectionChanged, marksSelectedEventHandler);

        removeEventListener = worksheet.addEventListener(
            tableau.TableauEventType.FilterChanged, marksSelectedEventHandler);
    }

    function saveSheetAndLoadSelectedMarks(worksheetName) {
        tableau.extensions.settings.set('sheet', worksheetName);
        tableau.extensions.settings.saveAsync();
        loadSelectedMarks(worksheetName);
        console.log('hi')

    }

    function filterByColumn(columnIndex, fieldName) {
        const columnValues = demoHelpers.getValuesInColumn(columnIndex);
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        // console.log(worksheets)
        // console.log(worksheet)

        worksheets[0].applyFilterAsync(fieldName, columnValues, tableau.FilterUpdateType.Replace);

        filteredColumns.push(fieldName);
    }

    function resetFilters() {
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        filteredColumns.forEach((columnName) => {
            worksheet.clearFilterAsync(columnName);
        });

        filteredColumns = [];
    }


    function drawDotChart(arr) {
        $('#wrapper').empty();
        const dateParser = d3.timeParse("%Y-%m-%d")
        const formatDate = d3.timeFormat("%b %-d, %y")
        const formatDate2 = d3.timeFormat("%b %d")

        const xAccessor = d => dateParser(d.date)
        const yAccessor = d => d.impressions
        const y2Accessor = d => d.conv_rate
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const tactic = d => d.tactic

        var arr_1 = []
        var arr_2 = []
        var arr_3 = []
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].tactic == 'Lookalike') {
                arr_1.push(arr[i])
            } else if (arr[i].tactic == 'Behavioral') {
                arr_2.push(arr[i])
            } else if (arr[i].tactic == 'In Market') {
                arr_3.push(arr[i])
            }
        }

        var j = 0;
        var arr1_imp;
        var imp_tac = [];
        for(let i=0; i<arr_3.length; i++){
          if (arr_3[i].date == arr_1[j].date){
            arr1_imp = arr_1[j].impressions
            j++;
          }else{
            arr1_imp = 0
          }
          imp_tac.push({
            'date': arr_3[i].date,
            'imp1': arr1_imp,
            'imp2': arr_2[i].impressions,
            'imp3': arr_3[i].impressions
          })
        }

        console.log(imp_tac)
       var subgroups = ['imp1', 'imp2', 'imp3']
       var data = imp_tac;
       var groups = d3.map(data, function(d){return(d.date)}).keys()

        const width = d3.min([
            window.innerWidth * 0.95,
        ])
        const height = d3.min([
            window.innerHeight * 0.9,
        ])

        let dimensions = {
            width: width,
            height: height,
            margin: {
                top: 30,
                right: 50,
                bottom: 40,
                left: 50,
            },
        }
        dimensions.boundedWidth = dimensions.width -
            dimensions.margin.right -
            dimensions.margin.left
        dimensions.boundedHeight = dimensions.height -
            dimensions.margin.top -
            dimensions.margin.bottom

        const wrapper = d3.select("#wrapper")
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        const bounds = wrapper.append("g")
            .style("transform", `translate(${
           dimensions.margin.left
         }px,${
           dimensions.margin.top
         }px)`)

        const div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const xxScale = d3.scaleTime()
            .domain(d3.extent(arr, xAccessor))
            .range([0, dimensions.boundedWidth])

        const xScale = d3.scaleBand()
            .range([0, dimensions.boundedWidth])
            .padding(0.1)

        const yScale = d3.scaleLinear()
            .range([dimensions.boundedHeight, 0])

        const y2Scale = d3.scaleLinear()
            .domain(d3.extent(arr, y2Accessor))
            .range([dimensions.boundedHeight, 0])

            xScale.domain(groups);
            yScale.domain([0, d3.max(arr, yAccessor)]);

            var color = d3.scaleOrdinal()
            .domain(subgroups)
            .range(['#FF8500','#4e79a7','#5EC7EB'])

          //stack the data? --> stack per subgroup
          var stackedData = d3.stack()
            .keys(subgroups)
            (data)

        function x_gridlines() {
            return d3.axisBottom(xxScale)
                .ticks(0)
        }

        function y_gridlines() {
            return d3.axisLeft(yScale)
                .ticks(10)
        }

        function y2_gridlines() {
            return d3.axisRight(y2Scale)
                .ticks(0)
        }

        bounds.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + dimensions.boundedHeight + ")")
            .call(x_gridlines()
                .tickSize(-dimensions.boundedHeight)
                .tickFormat("")
            )

        bounds.append("g")
            .attr("class", "grid")
            .call(y_gridlines()
                .tickSize(-dimensions.boundedWidth)
                .tickFormat("")
            )

        bounds.append("g")
            .attr("class", "grid_y2")
            // .attr("stroke-dasharray", "4px 4px")
            .call(y2_gridlines()
                .tickSize(dimensions.boundedWidth)
                .tickFormat("")
            )

        const curve = d3.curveLinear



        function mouseOn(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 1)
            div.html("Impressions: " + d.impressions)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOut(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
                .style("opacity", 0.6)
        };

        function mouseOnLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 0.3)
            div.html("Partner:" + d.partner + "<br/>" + "Impressions: " + d.impressions)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOutLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
            .style("opacity", 0);
        };

        var clip = bounds.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", dimensions.boundedWidth)
            .attr("height", dimensions.boundedHeight)
            .attr("stroke","none")
            .attr("x", 0)
            .attr("y", 0);

        // var brush = d3.brushX()
        //     .extent([
        //         [0, 0],
        //         [dimensions.boundedWidth, dimensions.boundedHeight]
        //     ])
        //     .on("end", updateChart)

        var area = bounds.append("g")
            .attr("class","areas")
            .attr("clip-path", "url(#clip)")

        const curve2 = d3.curveLinear

        const line1 = d3.line()
            .x(d => xxScale(xAccessor(d)))
            .y(d => y2Scale(y2Accessor(d)))
            .curve(curve2)

        area.append("path")
            .data(arr)
            .attr("fill", 'none')
            .attr("stroke-width","1px")
            .attr("stroke", "white")
            .attr("d", line1(arr))

        area.append("g")
        .selectAll("g")
        // Enter in the stack data = loop key per key = group per group
        .data(stackedData)
        .enter().append("g")
          .attr("fill", function(d) { return color(d.key); })
          .selectAll("rect")
          // enter a second time = loop subgroup per subgroup to add all rectangles
          .data(function(d) { return d; })
          .enter().append("rect")
          .attr("class", "bars")
            .attr("x", function(d) { return xScale(d.data.date); })
            .attr("y", function(d) { return yScale(d[1]); })
            .attr("height", function(d) { return yScale(d[0]) - yScale(d[1]); })
            .attr("width",xScale.bandwidth())

          // area
          //     .append("g")
          //     .attr("class", "brush")
          //     .call(brush);
        //
        // var idleTimeout
        //
        // function idled() {
        //     idleTimeout = null;
        // }
        //
        // function updateChart() {
        //     // What are the selected boundaries?
        //     var extent = d3.event.selection
        //     // If no selection, back to initial coordinate. Otherwise, update X axis domain
        //     if (!extent) {
        //         if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
        //         xxScale.domain([4, 8])
        //     } else {
        //         xxScale.domain([xxScale.invert(extent[0]), xxScale.invert(extent[1])])
        //         area.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
        //     }
        //     // Update axis and area position
        //     xAxis.transition().duration(1000).call(
        //         d3.axisBottom(xxScale)
        //         .ticks(5)
        //         .tickFormat(formatDate2))
        //
        //     area
        //     .select('.bars')
        //     .transition()
        //     .duration(1000)
        //     .attr("x", function(d) { return xScale(d.data.date); })
        //     .attr("y", function(d) { return yScale(d[1]); })
        //     .attr("height", function(d) { return yScale(d[0]) - yScale(d[1]); })
        //     .attr("width",xScale.bandwidth())
        //
        // }
        //
        // bounds.on("dblclick", function() {
        //     xScale.domain(d3.extent(arr, xAccessor))
        //     xAxis.transition().call(d3.axisBottom(xScale)
        //         .ticks(9)
        //         .tickFormat(formatDate))
        //     area
        //         .select('.bars1')
        //         .transition()
        //         .attr("x", function(d) { return xScale(d.data.date); })
        //         .attr("y", function(d) { return yScale(d[1]); })
        //         .attr("height", function(d) { return yScale(d[0]) - yScale(d[1]); })
        //         .attr("width",xScale.bandwidth())
        //
        // });
        const remove_zero = d => (d / 1e6) + "M";

        const yAxisGenerator = d3.axisLeft()
            .scale(yScale)
            .ticks(5)
            .tickFormat(remove_zero);

        const yAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(yAxisGenerator)
            .attr("font-family", "Arial")
            .attr("font-size", "10")
            .attr("text-align", "left")



        const y2AxisGenerator = d3.axisRight()
            .scale(y2Scale)
            .ticks(5)
            // .tickFormat(d => (d * 10) + "%");

        const y2Axis = bounds.append("g")
            .attr("class","axisLine")
            .call(y2AxisGenerator)
            .style("transform", `translateX(${
              dimensions.boundedWidth
            }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "10")
            .attr("text-align", "left")



        const xAxisGenerator = d3.axisBottom()
            .scale(xxScale)
            .ticks(9)
            .tickFormat(formatDate);


        const xAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(xAxisGenerator)
            .style("transform", `translateY(${
        dimensions.boundedHeight
      }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "10")

        const xAxisLabel = xAxis.append("text")
            .attr("x", dimensions.boundedWidth / 2)
            .attr("y", dimensions.margin.bottom)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("")
            .attr("fill", "white")

        const yAxisLabel = yAxis.append("text")
            .attr("x", -dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.left + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Impressions")
            .style("transform", "rotate(-90deg)")
            .style("text-anchor", "middle")
            .style("fill", "white")

        const y2AxisLabel = y2Axis.append("text")
            .attr("x", dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.right + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Conversion Rate")
            .style("transform", "rotate(90deg)")
            .style("text-anchor", "middle")
            .attr("fill", "white")

    }

})();
