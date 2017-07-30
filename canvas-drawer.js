/**
 * Created by zetabit (Serhii Doroshenkov) on 15.05.2015.
 * email: zetabit@mail.ru
 * Free to use with author permission
 *
 * Uses JQuery
 *
 * Usage:
 *  create <canvas id='id-canvas'>
 *  var cnv = new TCanvas('id-canvas', jquery_data, link-addr);
 *  jquery_data = array[
 *    Object1[
 *      id: number
 *      coordinates:SVG polygon1 points
 *      color: #hex_value
 *      img: src_img
 *    ],
 *    Object2[
 *      id:
 *      coordinates:SVG polygon2 points
 *      color:
 *      img:
 *    ],
 *  ]
 *
 *
 * */
window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };

TPoint = function(string){
    this.x = 0;
    this.y = 0;
    var arr = string.split(',');
    this.x = parseFloat(arr[0]);
    this.y = parseFloat(arr[1]);
    //console.log(string);
    //console.dir(arr);
}
TCoordinates = function(coordinates){
    this.points = [];
    var str = coordinates;
    var buf = str;
    str = str.replace('M','').replace('Z','');
    var arr = str.split('L');
    for(var i=0; i<arr.length; i++){
        this.points.push(new TPoint(arr[i]));
    }
    this.minmax = this.calcMinMax();
    //console.log('before:' +buf +'\r\n after:'+str);
}
TCoordinates.prototype.getTopRight = function(){
    return {'right':this.minmax.maxX, 'top':this.minmax.minY};
}
TCoordinates.prototype.getTopLeft = function(){
    return {'left':this.minmax.minX, 'top':this.minmax.minY};
}
TCoordinates.prototype.getBottomRight = function(){
    return {'right':this.minmax.maxX, 'bottom':this.minmax.maxY};
}
TCoordinates.prototype.getBottomLeft = function(){
    return {'left':this.minmax.minX, 'bottom':this.minmax.maxY};
}
TCoordinates.prototype.calcMinMax = function () {
    var maxX = this.points[0].x, maxY = this.points[0].y, minX = this.points[0].x, minY = this.points[0].y;
    for(var iPoint=0; iPoint<this.points.length; iPoint++){
        $p = this.points[iPoint];
        if(maxX<=$p.x) maxX = $p.x;
        if(minX>=$p.x) minX = $p.x;
        if(maxY<=$p.y) maxY = $p.y;
        if(minY>=$p.y) minY = $p.y;
    }
    return {'minX':minX, 'maxX':maxX, 'minY':minY, 'maxY':maxY};
}
TCoordinates.prototype.center = function(){
    var maxX = this.minmax.maxX, maxY = this.minmax.maxY, minX = this.minmax.minX, minY = this.minmax.minY;
    return {'x':minX+((maxX-minX)/2), 'y':minY+((maxY-minY)/2)};
}
TPrimitive = function(data){ //id, title, color, coordinates, img, status){
    this.floor = data['floor'] || "";
    this.title = data['title'] || "";
    this.color = data['color'] || "";
    this.rgbArr= this.colorToRGB();
    this.id    = data['id'] || "";
    this.img   = data['img'] || "";
    this.status= data['status'] || 0;
    this.rooms = data['rooms'] || -1;
    this.isstudio= data['is_studio'] || 0;
    this.area_living= data['area_living'] || 0;
    this.area_koeff = data['area_koeff'] || 0;
    this.area_total = data['area_total'] || 0;
    this.many   = data['many'] || 0;
    this.coordinates = new TCoordinates(data['coordinates'] || "");
    this.XY = [];
}
TPrimitive.prototype.inPoly = function(x,y){//для обычных не пересекающихся сторонами многоугольников
    if(typeof this.XY[x]!=='undefined' && typeof this.XY[x][y]!=='undefined') return this.XY[x][y];
    npol = this.coordinates.points.length;
    j = npol-1;
    var c=0;
    for(i=0; i<npol; i++){
        var $pi = this.coordinates.points[i], $pj = this.coordinates.points[j];
        if ( ( (($pi.y<=y)&&(y<$pj.y)) || (($pj.y<=y)&&(y<$pi.y)) ) && ( x>($pj.x-$pi.x)*(y-$pi.y)/($pj.y-$pi.y) + $pi.x) )
            c = !c;
        j = i;
    }
    if(typeof this.XY[x]=='undefined') this.XY[x] = [];
    this.XY[x][y] = c;
    return c;
}
TPrimitive.prototype.colorToRGB = function(){
    function hexToR(h) {return parseInt((cutHex(h)).substring(0,2),16)}
    function hexToG(h) {return parseInt((cutHex(h)).substring(2,4),16)}
    function hexToB(h) {return parseInt((cutHex(h)).substring(4,6),16)}
    function cutHex(h) {return (h.charAt(0)=="#") ? h.substring(1,7):h}
    $hex = cutHex(this.color);
    return [hexToR($hex), hexToG($hex), hexToB($hex)];
}
/*
 Canvas drawer, developed by Serhii Doroshenkov, 2015
 email: zetabit@mail.ru
 */
TCanvas = function(id, bg_id, data, link, obj){
    var obj = obj || {};
    this.node = document.getElementById(id);

    this.canvasBgArray = [];
    if(typeof bg_id == 'string')
        this.canvasBg = document.getElementById(bg_id);
    else if( Object.prototype.toString.call( bg_id ) === '[object Array]' ){
        for (var i=0; i<bg_id.length; i++)
            if (i==0) this.canvasBg = document.getElementById(bg_id[i]);
            else this.canvasBgArray.push(document.getElementById(bg_id[i]));
    }

    this.canvasZoom = null;
    this.xzoom = 2;
    this.zoomView = 70; // %
    this.zoomArea = [];
    this.zoomViewArea = [];
    this.img = $('<img/>');
    this.fontSize = 25; //px , относительно картинки
    this.kx = 1.0;
    this.ky = 1.0;
    this.realWidth = 0;
    this.realHeight = 0;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.primitives = [];
    this.link = link || "";
    this.curPrimitive = -1;
    this.selectedRoom = {};
    this.showCaptionHouses = false; //показывать напдиси блоков (домов)
    this.showCaptionRooms = false;  //показывать надписи обычно (в плане этажа)
    this.showCaptionBlock = false;  //показывать блок напротив выбранного этажа
    this.CaptionBlock    = null;
    this.showCaptionByer = false;   //показывать замочек (если продана квартира)
    this.showSelectedRoom = false;  //показывать текущую квартиру (если есть обьект квартиры в selectedRoom)
    this.calcResizes      = false;  // false - на весь экран, true - в блоке
    this.showTourCaptions = false;
    this.showDetailRoom   = false;  //показывать при наведении на квартиру мышкой инфу в тегах (содержит указатели на теги или false)
    this.debug            = false;
    this.bCalculating     = false;
    this.hideCountRoom    = false;
    this.onHoverColor     = "rgba(50,50,50,0.8)";
    this.positionCaptionBlock = 'x';    //позиция блока относительно выбранного полигона (x-справа/слева по центру высоты полигона), (y-снизу полигона по центру ширины)
    for (var key in obj){
        if(obj.hasOwnProperty(key))
            this[key] = obj[key];
    }
    this.left = 0;
    var self = this;
    this.node.change = function(){
        self.init();
    }
    self.init();
    this.loadData(data);
}
TCanvas.prototype.init = function(){
    if(this.debug) console.log('[canvas drawer] init');
    img = $('<img/>');
    drawingCanvas = this.node;
    backgroundCanvas = this.canvasBg;
    var self = this,
        parent = $(drawingCanvas).parent();
    this.left = parseInt($('.open-close').width());
    this.realWidth = $(drawingCanvas).width();
    this.realHeight = $(drawingCanvas).height();
    var curLoadedBgCanvas = 0;

    function loaded() {
        if(self.debug){
            console.log('[canvas drawer] loaded image ['+this.src+']...');
            console.log(backgroundCanvas);
        }
        self.img = this;
        self.canvasWidth = this.width;
        self.canvasHeight = this.height;
        backgroundCanvas.width = self.canvasWidth;
        backgroundCanvas.height = self.canvasHeight;
        var ctx = backgroundCanvas.getContext('2d');
        $(drawingCanvas).attr('width', self.canvasWidth).attr('height', self.canvasHeight);
        $(backgroundCanvas).attr('width', self.canvasWidth).attr('height', self.canvasHeight);
        if(backgroundCanvas && backgroundCanvas.getContext){
            ctx.drawImage( this, 0, 0, self.canvasWidth, self.canvasHeight );
            /*
             if(self.debug){
             ctx.font = "30px Arial";
             ctx.fillText('w:'+self.canvasWidth+' h:'+self.canvasHeight,500,50);
             ctx.fillText('real w:'+self.realWidth+' real h:'+self.realHeight,500,150);
             console.log('w:'+self.canvasWidth+' h:'+self.canvasHeight);
             console.log('real w:'+self.realWidth+' real h:'+self.realHeight);
             }
             */
            if(curLoadedBgCanvas==0) {
                ctx = self.node.getContext('2d');
                ctx.clearRect(0,0,self.canvasWidth, self.canvasHeight);

                //чтоб не перерисовывать с картинки, будем перерысовывать с канвы
                self.canvas = drawingCanvas;
                self.canvas.width  = self.canvasWidth;
                self.canvas.height = self.canvasHeight;
                self.drawCaptions();
                self.onmove(0,0,0,0);
                self.calcKxKy();
                if(self.showTourCaptions){
                    var curPrimitive = self.curPrimitive;
                    for(var iPrimitive=0; iPrimitive<self.primitives.length; iPrimitive++){
                        self.curPrimitive = iPrimitive;
                        self.drawCenterEye();
                    }
                    self.curPrimitive = curPrimitive;
                }
                if(self.calcResizes){
                    self.resize();
                    self.calcKxKy();

                    self.onmove(0,0,0,0);
                }
            }
        }
        $(this).attr('src', 'about:blank');

        if(curLoadedBgCanvas<self.canvasBgArray.length){
            backgroundCanvas = self.canvasBgArray[curLoadedBgCanvas];
            curLoadedBgCanvas ++;
            img = $('<img/>');
            img
                .attr('src', $(backgroundCanvas).attr('data-src'))
                .on('load', loaded);
        } else self.initEvents();
    }

    img
        .attr('src', $(drawingCanvas).attr('data-src'))
        .on('load', loaded);
}
TCanvas.prototype.initEvents = function(){
    if(this.debug) console.log('[canvas drawer] init');
    img = $('<img/>');
    drawingCanvas = this.node;
    backgroundCanvas = this.canvasBg;
    var self = this,
        parent = $(drawingCanvas).parent();
    this.left = parseInt($('.open-close').width());
    this.realWidth = $(drawingCanvas).width();
    this.realHeight = $(drawingCanvas).height();
    var curLoadedBgCanvas = 0;
    $(drawingCanvas).off('mousemove');
    $(drawingCanvas).on('mousemove', function(ev){
        if(self.bCalculating) return;
        self.bCalculating = true;
        /*
         if(self.debug){
         console.log('x:'+ev.pageX+' y:'+ev.pageY);
         console.log('rx:'+ev.pageX*self.kx+' ry:'+ev.pageY*self.ky);
         }
         */
        //self.onmove((ev.pageX-self.left)*self.kx, ev.pageY*self.ky);
        var ev = ev || event;
        var coords = ev.target.getBoundingClientRect(),
            x = ev.offsetX==undefined?ev.clientX-coords.left:ev.offsetX,
            y = ev.offsetY==undefined?ev.clientY-coords.top:ev.offsetY;
        /*
         if(self.debug){
         console.log(x,y);
         console.dir(coords);
         }
         */
        self.onmove((x)*self.kx, y*self.ky, x, y);
        self.bCalculating = false;
        ev.preventDefault();
    });
    $(drawingCanvas).off('click touchstart');
    $(drawingCanvas).on("click touchstart", function(ev){
        var ev = ev || event;
        var coords = ev.target.getBoundingClientRect(),
            x = ev.originalEvent.touches ? ev.originalEvent.touches[0].pageX-coords.left : ev.offsetX==undefined?ev.clientX-coords.left:ev.offsetX,
            y = ev.originalEvent.touches ? ev.originalEvent.touches[0].pageY-coords.top : ev.offsetY==undefined?ev.clientY-coords.top:ev.offsetY;
        self.onmove((x)*self.kx, y*self.ky, x, y);
        var ctx = drawingCanvas.getContext('2d');
        if(drawingCanvas && drawingCanvas.getContext && self.debug) {
            ctx.fillStyle = 'rgba(255,255,255,1)';
            ctx.fillRect(500, 220, 500, 50);
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.fillText(ev.type+': x:' + x + ' y:' + y, 500, 250);
        }
        self.click();
        ev.preventDefault();
    });
    $(window).off('resize');
    $(window).on('resize', function(){
        self.resize();
    });
    $('.preloader').css('display', 'none');
}
TCanvas.prototype.initZoom = function(id){
    return;
    zoomCanvas = this.canvasZoom = document.getElementById(id);
    drawingCanvas = this.node;
    backgroundCanvas = this.canvasBg;

    var self = this,
        parent = $(drawingCanvas).parent();
    img
        .attr('src', $(drawingCanvas).attr('src'))
        .on('load', function () {
            self.img = this;
            self.canvasWidth = this.width;
            self.canvasHeight = this.height;
            var zWi = (this.width*(self.zoomView/100)), zHe = (this.height*(self.zoomView/100));
            self.zoomViewArea = [(this.width-zWi)/2, (this.height-zHe)/2, zWi, zHe];
            self.zoomArea   = [ self.zoomViewArea[0]/self.xzoom, self.zoomViewArea[1]/self.xzoom, self.zoomViewArea[2]/self.xzoom, self.zoomViewArea[3]/self.xzoom ];
            zoomCanvas.width = self.canvasWidth;
            zoomCanvas.height = self.canvasHeight;
            var ctx = zoomCanvas.getContext('2d');
            $(zoomCanvas).attr('width', self.canvasWidth).attr('height', self.canvasHeight);
            if(zoomCanvas && zoomCanvas.getContext){
                ctx.clearRect(0,0, self.canvasWidth, self.canvasHeight);
                self.calcKxKy();
            }
            $(this).attr('src', 'about:blank');
        })

    $(zoomCanvas).on('mousemove', function(ev){
        $(drawingCanvas).onmousemove(ev);
    })

    $(zoomCanvas).on('mouseleave', function(ev){
        canvasZoom = self.canvasZoom, canvasBg = self.canvasBg;
        var ctxBg = canvasBg.getContext('2d'), ctxZoom = canvasZoom.getContext('2d');
        if (ctxBg && canvasBg.getContext && ctxZoom && canvasZoom.getContext) {
            ctxZoom.clearRect(self.zoomViewArea[0], self.zoomViewArea[1], self.zoomViewArea[2], self.zoomViewArea[3]);
        }
    })

    $(window).on('resize', function(){
        self.resize();
    })
}
TCanvas.prototype.calcKxKy = function(){
    if(this.canvas==null) return;
    if(!this.calcResizes){
        var pNode = this.node.parentNode,
            bWi = $(window).width(),
            bHe = $(window).height(),
            rWi = this.canvasWidth,
            rHe = this.canvasHeight,
            bd = bWi/bHe, rd = rWi/rHe,
            arr = this.canvasBgArray;

        if(bd>rd){
            $(this.canvas).css({'width':bWi, 'height':bWi/rd, 'top':(bHe-bWi/rd)/2, 'left':0});
            $(this.canvasBg).css({'width':bWi, 'height':bWi/rd, 'top':(bHe-bWi/rd)/2, 'left':0});
            for(var i=0; i<arr.length; i++) $(arr[i]).css({'width':bWi, 'height':bWi/rd, 'top':(bHe-bWi/rd)/2, 'left':0});
        } else if(bd<rd){
            $(this.canvas).css({'width':bHe*rd, 'height':bHe, 'top':0, 'left':(bWi-bHe*rd)/2});
            $(this.canvasBg).css({'width':bHe*rd, 'height':bHe, 'top':0, 'left':(bWi-bHe*rd)/2});
            for(var i=0; i<arr.length; i++) $(arr[i]).css({'width':bHe*rd, 'height':bHe, 'top':0, 'left':(bWi-bHe*rd)/2});
        } else {
            $(this.canvas).css({'width':bWi, 'height':bHe, 'top':0, 'left':0});
            $(this.canvasBg).css({'width':bWi, 'height':bHe, 'top':0, 'left':0});
            for(var i=0; i<arr.length; i++) $(arr[i]).css({'width':bHe*rd, 'height':bHe, 'top':0, 'left':(bWi-bHe*rd)/2});
        }
    }
    /*
     if ($(window).width() > $(this.node.parentNode).width()) {
     var wi = $(window).width() - $(this.node.parentNode).width();
     console.log(wi);
     $(this.node).css('width', $(window).width() - this.left)
     .css('margin-top', wi/2);
     $(this.canvasBg).css('width', $(window).width() - this.left)
     .css('margin-top', wi/2);
     }
     */
    /*
     var pNode = this.node.parentNode,
     delimiter = this.canvasWidth / this.canvasHeight,
     he = $(pNode).width() / delimiter;
     if ($(window).height() < he) {
     /*
     var margin = he - $(window).height();
     $(this.node).css('margin-top', -(margin/2.5)).css('margin-bottom', -(margin/2.5));
     $(this.canvasBg).css('margin-top', -(margin/2.5)).css('margin-bottom', -(margin/2.5));
     */
    /*
     he = $(window).height();
     var wi = he * delimiter;
     $(this.node).css('width', wi).css('margin-left', (($(window).width() - $(this.node).width()) / 2) - this.left);
     $(this.canvasBg).css('width', wi).css('margin-left', (($(window).width() - $(this.node).width()) / 2) - this.left);
     }
     $(this.node).css('height', he);
     $(this.canvasBg).css('height', he);
     */

    this.realWidth = $(this.node).width();
    //$(this.node).css('height', this.realWidth/(this.canvasWidth/this.canvasHeight));
    //$(this.canvasBg).css('height', this.realWidth/(this.canvasWidth/this.canvasHeight));
    this.realHeight = $(this.node).height();
    this.kx = this.canvasWidth/this.realWidth;
    this.ky = this.canvasHeight/this.realHeight;
}
TCanvas.prototype.loadData = function(data){
    if(this.debug) console.log('loading data.. preparing');
    var arr = $.parseJSON(data);
    if(this.debug) console.log('loading data.. elements ['+arr.length+']');
    for(var i=0; i<arr.length; i++){
        $p = new TPrimitive(arr[i]);
        if($p.coordinates.points.length>2)  //смысла нет добавлять в отрисовку если меньше точек
            this.primitives.push($p);
    }
}
TCanvas.prototype.onmove = function(x,y, realX, realY){
    canvas = this.node;
    var ctx = canvas.getContext('2d'),
        tbl = this.CaptionBlock;
    img = this.img;
    self = this;

    if(canvas && canvas.getContext){
        this.node.style.cursor = 'default';
        tbl.css('display', 'none');
        if(!this.showTourCaptions) ctx.clearRect( 0, 0, this.canvasWidth, this.canvasHeight);
        this.curPrimitive = -1;
        for(var i=0; i<this.primitives.length; i++){
            this.drawCaption(i);
            var $p = this.primitives[i];
            if(!this.showTourCaptions && $p.inPoly(x,y)){
                this.onhover($p);
                //купленые нельзя выбрать
                if(false && this.showCaptionRooms && this.showCaptionByer && ($p.status==0)) this.curPrimitive = -1;
                else {  //
                    if(this.showCaptionHouses  || this.showCaptionBlock)
                        this.fillStyle(ctx, $p, 0.6, this.onHoverColor);
                    else if($p.status==0 && this.showCaptionRooms) this.fillStyle(ctx, $p, 0.8, this.onHoverColor);
                    else this.fillStyle(ctx, $p, 0.8);
                    if($p.status==0) this.node.style.cursor = 'pointer';
                    this.curPrimitive = i;
                }

                tbl.css('position','fixed');
                tbl.find('#sect').html($p.title);
                tbl.find('#floor').html($p.floor);
                tbl.find('#rooms').html($p.isstudio ? "студия" : $p.rooms);
                if($p.isstudio) tbl.find('.plan__info-div-rooms').css('display', 'none');
                else tbl.find('.plan__info-div-rooms').css('display', 'block');
                tbl.find('#square').html($p.area_total);
                tbl.find('#room').html("xz");

                //tbl.css('margin-left', parseInt($(canvas).css('margin-left')));
                if(this.showCaptionBlock) tbl.css('display', 'block'); else tbl.css('display','none');
                window['isCaptionAnimate'] = window['isCaptionAnimate'] || false;
                if(!window['isCaptionAnimate']) {
                    if(this.positionCaptionBlock=="x"){ //слева справа по Х, У - позиция мышки
                        var crd = $p.coordinates.getTopRight();
                        var left = ((crd.right / this.kx) + parseInt($(canvas).offset().left) ) + 20;
                        var top = ($p.coordinates.center().y / this.ky) + parseInt($(canvas).offset().top) - (tbl.height()/2) ;
                        if((tbl.width()+left)>($(window).width()-200)) {
                            tbl.find('.plan__info-arrow-left').css('display', 'none');
                            tbl.find('.plan__info-arrow-right').css('display', 'block');
                            crd = $p.coordinates.getTopLeft();
                            left = ((crd.left / this.kx) + parseInt($(canvas).offset().left) - tbl.width() - 45 );
                        } else {
                            tbl.find('.plan__info-arrow-left').css('display', 'block');
                            tbl.find('.plan__info-arrow-right').css('display', 'none');
                        }
                        //top = realY + parseInt($(canvas).offset().top) - (tbl.height()/2);
                        window['dX'] = left; window['dY'] = top;
                        tbl.css({'left':left, 'top':top});
                    } else if(this.positionCaptionBlock=="y") { // сверху снизу по У, по Х позиция мышки
                        var left = (($p.coordinates.center().x / this.kx) + parseInt($(canvas).offset().left) ) - (tbl.outerWidth()/2),
                            top = ($p.coordinates.getBottomRight().bottom / this.ky) + parseInt($(canvas).offset().top);
                        if((tbl.outerHeight()+top)>($(window).height+100)) {
                            tbl.find('.plan__info-arrow-top').css('display', 'none');
                            tbl.find('.plan__info-arrow-bottom').css('display', 'block');
                            top = ($p.coordinates.getTopRight().top / this.ky)+parseInt($(canvas).offset().top) - tbl.outerHeight();
                        } else {
                            tbl.find('.plan__info-arrow-top').css('display', 'block');
                            tbl.find('.plan__info-arrow-bottom').css('display', 'none');
                        }
                        window['dX'] = left; window['dY'] = top;
                        tbl.css({'left':left, 'top':top});
                    }
                }
                if(!this.showCaptionRooms) break;   //если не показываем этаж, где надо и не ховер элементы показывать
            } else if(this.showCaptionRooms) {
                if($p.status!=0) this.fillStyle(ctx, $p, 0.4, null);
            } else if(this.showTourCaptions){
                $points = $p.coordinates.points;
                if( (x>$points[0].x-25 && x<$points[0].x+25) && (y>$points[0].y-30 && y<$points[0].y+30) ) {
                    this.node.style.cursor = 'pointer';
                    this.curPrimitive = i;
                    break;
                }
                else {
                    this.node.style.cursor = 'default';
                    this.curPrimitive = -1;
                }
            }
        }
        if(this.showSelectedRoom) this.fillStyle(ctx, this.selectedRoom, 1, null, "#5b0404");
        this.drawCaptions();
    }
}
TCanvas.prototype.onmoveZoom = function(x,y, realX, realY) {
    var ev = ev || null;
    var coords = ev ? ev.target.getBoundingClientRect() : null,
        realX = ev ? ev.offsetX == undefined ? ev.clientX - coords.left : ev.offsetX : 0,
        realY = ev ? ev.offsetY == undefined ? ev.clientY - coords.top : ev.offsetY : 0;
    canvasZoom = this.canvasZoom, canvasBg = this.canvasBg;
    var ctxBg = canvasBg.getContext('2d'), ctxZoom = canvasZoom.getContext('2d');

    if (ctxBg && canvasBg.getContext && ctxZoom && canvasZoom.getContext) {
        ctxZoom.clearRect( this.zoomViewArea[0], this.zoomViewArea[1], this.zoomViewArea[2], this.zoomViewArea[3] );
        ctxZoom.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctxZoom.fillRect( this.zoomViewArea[0], this.zoomViewArea[1], this.zoomViewArea[2], this.zoomViewArea[3] );
        var dx = (this.zoomArea[2]-this.zoomArea[0])/2, dy = (this.zoomArea[3]-this.zoomArea[1])/2;
        //console.log('x:', x, 'realX:', realX, 'dx:', dx, 'y:', y, 'realY:', realY, 'dy:', dy);
        ctxZoom.drawImage(
            canvasBg,
            x-dx, y-dy, dx*2, dy*2,
            this.zoomViewArea[0], this.zoomViewArea[1], this.zoomViewArea[2], this.zoomViewArea[3]
        );
    }
}
TCanvas.prototype.fillStyle = function(ctx, $p, opacity, color, stroke, strokeWidth){
    var $points = $p.coordinates.points;
    var color = color || null;
    var stroke = stroke || null;
    var opacity = opacity || 0.9;
    var strokeWidth = strokeWidth || null;

    ctx.beginPath();
    for(var j=0; j<$points.length; j++){
        if(j==0)
            ctx.moveTo($points[j].x, $points[j].y);
        else
            ctx.lineTo($points[j].x, $points[j].y);
    }
    ctx.closePath();

    if(stroke!=null){
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth || 15;
    }
    if(color!=null && color=="") color=null;
    if(color!=null){
        ctx.fillStyle = color;
    }else if(this.showCaptionRooms){
        /*
         if($p.rooms==1)
         {
         ctx.fillStyle = $p.isstudio==0 ? "rgba(251,241,200,"+opacity+")" : "rgba(223,183,252,"+opacity+")";
         }
         else if($p.rooms==2)
         {
         ctx.fillStyle = "rgba(188,200,253,"+opacity+")";
         }
         else if($p.rooms==3)
         {
         ctx.fillStyle = "rgba(185,214,183,"+opacity+")";
         }
         */
        //ctx.fillStyle = $p.status==0 ? "rgba(165,162,153,0.9)" : "rgba(125,115,92,0.9)";

        if($p.status==0) {
            ctx.fillStyle = color || 'rgba(0,0,0,0.6)'; //'rgba(79,156,43,0.6)'
        }
        else if($p.status==1)
            ctx.fillStyle = color || "rgba(125,25,25,0.6)";
        else if($p.status==2){
            ctx.fillStyle = "rgba(225,225,225,0.3)";
            ctx.fill();
            var img = new Image();
            var xself = this;
            img.onload = function () {
                //ctx.drawImage(img, 250, 30);
                var pattern = ctx.createPattern(img, "repeat");
                ctx.fillStyle = pattern;
                //ctx.rect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                for(var j=0; j<$points.length; j++){
                    if(j==0)
                        ctx.moveTo($points[j].x, $points[j].y);
                    else
                        ctx.lineTo($points[j].x, $points[j].y);
                }
                ctx.closePath();
                ctx.fill();
                xself.drawCaption(xself.curPrimitive);
            };
            img.src = "/img/plan/reserv.png";
        }
    } else ctx.fillStyle = "rgba("+$p.rgbArr[0]+", "+$p.rgbArr[1]+", "+$p.rgbArr[2]+", "+opacity+")";
    if( $p.status!=2 ) ctx.fill();
    if(stroke!=null) ctx.stroke();
}
TCanvas.prototype.click = function(){
    if(this.curPrimitive>=0 && this.primitives[this.curPrimitive].status==0) {
        window.location.href = this.link+''+this.primitives[this.curPrimitive].id;
    }
}
TCanvas.prototype.drawCenter = function(inverse, cur){
    var inverse = inverse || false;
    var cur = cur || this.curPrimitive;
    if(this.curPrimitive>=0 && this.showCaptionHouses){
        var $p = this.primitives[cur];
        var $coordinates = $p.coordinates;
        var $center = $coordinates.center();
        var ctx = this.node.getContext('2d');
        ctx.beginPath();
        var sizeX = this.fontSize*$p.title.length, sizeY = this.fontSize;
        var padding = 5, triangle = 12;

        ctx.moveTo($center.x-sizeX, $center.y-sizeY);
        ctx.lineTo($center.x+sizeX, $center.y-sizeY);
        ctx.lineTo($center.x+sizeX, $center.y+sizeY);

        ctx.lineTo($center.x+sizeX-(sizeX-triangle), $center.y+sizeY);
        ctx.lineTo($center.x+sizeX-(sizeX), $center.y+sizeY+triangle);
        ctx.lineTo($center.x+sizeX-(sizeX+triangle), $center.y+sizeY);

        ctx.lineTo($center.x-sizeX, $center.y+sizeY);
        ctx.closePath();

        if(inverse) {
            ctx.fillStyle = "rgba(255,255,255, 1)";
            ctx.strokeStyle = "rgba(216,186,137, 1)";
        } else {
            ctx.fillStyle = "rgba(216,186,137, 1)";
            ctx.strokeStyle = "rgba(255,255,255, 1)";
        }
        ctx.fill();

        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.moveTo($center.x-sizeX+padding, $center.y-sizeY+padding);
        ctx.lineTo($center.x+sizeX-padding, $center.y-sizeY+padding);
        ctx.lineTo($center.x+sizeX-padding, $center.y+sizeY-padding);

        ctx.lineTo($center.x+sizeX-(sizeX-triangle)-padding, $center.y+sizeY-padding);
        ctx.lineTo($center.x+sizeX-(sizeX), $center.y+sizeY+triangle-(padding*2));
        ctx.lineTo($center.x+sizeX-(sizeX+triangle)+padding, $center.y+sizeY-padding);

        ctx.lineTo($center.x-sizeX+padding, $center.y+sizeY-padding);
        ctx.lineTo($center.x-sizeX+padding, $center.y-sizeY+padding);
        ctx.stroke();
        ctx.closePath();

        ctx.lineWidth = 2;
        ctx.font = '35px Serial';
        ctx.fillStyle = inverse ? "rgba(216,186,137, 1)" : "rgba(100,86,64, 1)";
        ctx.fillText($p.title, $center.x-sizeX/3, $center.y+sizeY/2);
    }
}
TCanvas.prototype.drawCenterEye = function(inverse, cur){
    var inverse = inverse || false;
    var cur = cur || this.curPrimitive;
    if(this.curPrimitive>=0){
        var $p = this.primitives[cur];
        var $coordinates = $p.coordinates;
        var $center = $coordinates.points[0];
        var ctx = this.node.getContext('2d');
        ctx.beginPath();
        var sizeX = 25*$p.title.length, sizeY = 25;
        var padding = 5, triangle = 12;

        ctx.moveTo($center.x-sizeX, $center.y-sizeY);
        ctx.lineTo($center.x+sizeX, $center.y-sizeY);
        ctx.lineTo($center.x+sizeX, $center.y+sizeY);

        ctx.lineTo($center.x+sizeX-(sizeX-triangle), $center.y+sizeY);
        ctx.lineTo($center.x+sizeX-(sizeX), $center.y+sizeY+triangle);
        ctx.lineTo($center.x+sizeX-(sizeX+triangle), $center.y+sizeY);

        ctx.lineTo($center.x-sizeX, $center.y+sizeY);
        ctx.closePath();

        if(inverse) {
            ctx.fillStyle = "rgba(255,255,255, 1)";
            ctx.strokeStyle = "rgba(216,186,137, 1)";
        } else {
            ctx.fillStyle = "rgba(216,186,137, 1)";
            ctx.strokeStyle = "rgba(255,255,255, 1)";
        }
        ctx.fill();

        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.moveTo($center.x-sizeX+padding, $center.y-sizeY+padding);
        ctx.lineTo($center.x+sizeX-padding, $center.y-sizeY+padding);
        ctx.lineTo($center.x+sizeX-padding, $center.y+sizeY-padding);

        ctx.lineTo($center.x+sizeX-(sizeX-triangle)-padding, $center.y+sizeY-padding);
        ctx.lineTo($center.x+sizeX-(sizeX), $center.y+sizeY+triangle-(padding*2));
        ctx.lineTo($center.x+sizeX-(sizeX+triangle)+padding, $center.y+sizeY-padding);

        ctx.lineTo($center.x-sizeX+padding, $center.y+sizeY-padding);
        ctx.lineTo($center.x-sizeX+padding, $center.y-sizeY+padding);
        ctx.stroke();
        ctx.closePath();

        $points = $p.coordinates.points;
        $('<img/>')
            .attr('src', '/virtual/[img]/Eye.png')
            .on('load', function(){
                ctx.drawImage( this, $center.x-sizeX/2, $center.y-sizeY/2, sizeX, sizeY );
                //$(this).attr('src', 'about:blank');
            });
    }
}
TCanvas.prototype.drawCaptions = function (setDraw) {
    this.showCaptionHouses = setDraw || this.showCaptionHouses;
    //var curPrimitive = this.curPrimitive;
    for(var iPrimitive=0; iPrimitive<this.primitives.length; iPrimitive++){
        //this.curPrimitive = iPrimitive;
        this.drawCaption(iPrimitive);
    }
    //this.curPrimitive = curPrimitive;
}
TCanvas.prototype.drawCaption = function(iPrimitive){
    var curPrimitive = this.curPrimitive;
    this.curPrimitive = iPrimitive;
    if(curPrimitive==iPrimitive) {
        if (this.showCaptionHouses) this.drawCenter(true);
        else if (this.showCaptionRooms) this.drawRoomCaptions(true);
    } else {
        if(this.showCaptionHouses) this.drawCenter();
        else if(this.showCaptionRooms) this.drawRoomCaptions();
    }
    this.curPrimitive = curPrimitive;
}
TCanvas.prototype.drawRoomCaptions = function(inverse){
    var inverse = inverse || false;
    if(this.curPrimitive>=0 && this.showCaptionRooms){
        var $p = this.primitives[this.curPrimitive];
        var $coordinates = $p.coordinates;
        var $center = $coordinates.center();
        var ctx = this.node.getContext('2d');
        ctx.beginPath();
        var kx = this.kx, ky = this.ky;
        if($(this.canvasBg).width()<500) {
            kx = 3; ky = 3;
        }
        var sizeX = 10* $p.title.length * kx, sizeY = 30 * ky, font2 = 0.25;    //т.к. 50 пкс символ


        {
            if(!this.hideCountRoom) {
                    // start кружочек
                    ctx.beginPath();
                    //ctx.rect($center.x-(25*kx), $center.y-(15*ky), 40*kx, 40*ky);
                    ctx.arc($center.x, $center.y, sizeY * 0.7, 0, 2 * Math.PI, false);
                    ctx.fillStyle = inverse ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0)';
                    ctx.fill();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'white';
                    ctx.stroke();
                    ctx.lineWidth = 2;
                    ctx.font = sizeY + 'px Serial';
                    ctx.fillStyle = "white";//inverse ? "rgba(216,186,137, 1)" : "rgba(100,86,64, 1)";
                    //if(this.showCaptionRooms) ctx.fillStyle = "rgba(255,255,255, 1)";
                    if($p.isstudio)
                        ctx.fillText("C", $center.x - (18 * kx), $center.y + (sizeY / 3), 20);
                    else
                        ctx.fillText($p.rooms, $center.x - (18 * kx), $center.y + (sizeY / 3));
                    ctx.font = (sizeY * font2) + 'px Serial';
                    ctx.fillText($p.area_living, $center.x - (4 * kx), $center.y - (sizeY / 6));
                    ctx.fillText($p.area_koeff, $center.x - (4 * kx), $center.y + (sizeY / 11));
                    ctx.fillText($p.area_total, $center.x - (4 * kx), $center.y + (sizeY / 3));
                    // end кружочек
                    ctx.closePath();
            } else {
                // start rect
                ctx.beginPath();
                ctx.rect($center.x-(30*kx), $center.y-(15*ky), 50*kx, 30*ky);
                //ctx.arc($center.x, $center.y, sizeY * 0.5, 0, 2 * Math.PI, false);
                ctx.fillStyle = inverse ? 'rgba(255,204,153,0.6)' : 'rgba(255,255,255,0.6)';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.font = sizeY*font2 + 'px Serial';
                ctx.fillStyle = "#5b0404";//inverse ? "rgba(216,186,137, 1)" : "rgba(100,86,64, 1)";
                //if(this.showCaptionRooms) ctx.fillStyle = "rgba(255,255,255, 1)";
                ctx.fillText($p.area_total, $center.x - (25 * kx), $center.y + ( (sizeY*font2) / 3));
                // end rect
                ctx.closePath();
            }
        }
    }
}
TCanvas.prototype.resize = function(){
    if(!this.calcResizes) return;
    var par = $(this.node).parent(),
        c = $(this.node),
        c2 = $(this.canvasBg),
        c3 = $(this.canvasZoom),
        arr = $(this.canvasBgArray);
    var k = this.canvasHeight/this.canvasWidth,
        needH = par.height(),
        needW = needH/ k,
        marginRL = 0,
        marginTB = 0;
    if(needW>par.width()){
        needW = par.width();
        needH = needW*k;
    }
    /*
     c.css({'height':needH, 'width':needW});
     c2.css({'height':needH, 'width':needW});
     if(c3) c3.css({'height':needH, 'width':needW});
     if(needW<par.width()) marginRL = (par.width()-needW)/2;
     if(needH<par.height()) marginTB = (par.height()-needH)/2;
     c.css('margin', marginTB+'px '+marginRL+'px');
     c2.css('margin', marginTB+'px '+marginRL+'px');//c2.css({'margin-left':marginRL, 'margin-right':marginRL});
     if(c3) c3.css('margin', marginTB+'px '+marginRL+'px');
     */
    c.css({'height':'auto', 'width':'100%'});
    c2.css({'height':'auto', 'width':'100%'});
    c3.css({'height':'auto', 'width':'100%'});
    for(var i=0; i<arr.length; i++) $(arr[i]).css({'height':'auto', 'width':'100%'});
    if(c.height()>par.height()){
        c.css({'height':'100%', 'width':'auto'});
        c2.css({'height':'100%', 'width':'auto'});
        c3.css({'height':'100%', 'width':'auto'});
        for(var i=0; i<arr.length; i++) $(arr[i]).css({'height':'100%', 'width':'auto'});
    }
    par.css({'width': c.width(), 'height': c.height()});
    this.calcKxKy();
    this.onmove(0,0,0,0);
}
TCanvas.prototype.onhover = function($p){   //наведение на квартиру мышкой
    if (typeof (this.showDetailRoom)=='object' && window['showedObjectTCanvasEl']!=$p){
        window['showedObjectTCanvasEl'] = $p;
        var dr = this.showDetailRoom;
        dr.number.innerHTML = $p.title;
        dr.rooms.innerHTML = $p.rooms;
        dr.square.innerHTML = $p.area_total;
        var many = '';
        function gap(n) {
            return n.replace(/\d{0,3}(?=(\d{3})+$)/g, "$& ") ;
        }
        dr.many.innerHTML = gap($p.many);
    }
}
TCanvas.prototype.drawTooltip = function(x,y, text){
    canvas = this.node;
    var ctx = canvas.getContext('2d');
    var $p = new TPrimitive('');
    $p.coordinates.points.push(x+','+y);
    $p.coordinates.points.push(x+(this.fontSize*text.length)+','+y);
    $p.coordinates.points.push(x+(this.fontSize*text.length)+','+y+this.fontSize+10);
    $p.coordinates.points.push(x+','+y+this.fontSize+10);
    this.fillStyle(ctx, $p, 1, 'rgba(60,10,10,1)');
}
