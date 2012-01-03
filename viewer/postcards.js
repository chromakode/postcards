var baseURL = "http://postcards.redditstatic.com/"

Postcard = Backbone.Model.extend({})

PostcardCollection = Backbone.Collection.extend({
    model: Postcard,
    url: baseURL + 'postcards.js',
    sync: function(method, model, options) {
        Backbone.sync(method, model, _.extend({
            dataType: 'jsonp',
            jsonp: false,
            jsonpCallback: 'postcardsCallback',
            cache: true // FIXME
        }, options))
    }
})

var PostcardZoomView = Backbone.View.extend({
    tagName: 'div',
    className: 'zoom',

    events: {
        'click': 'zoom'
    },

    render: function() {
        $(this.el)
            .append(
                this.make('img', {class: 'side front'}),
                this.make('img', {class: 'side back'})
            )

        var smallImages = this.model.get('images').small
        this._setImages(smallImages)
        this._size(smallImages)
        this._position()

        var frontOrientation = smallImages.front.width > smallImages.front.height,
            backOrientation = smallImages.back.width > smallImages.back.height
        if (frontOrientation != backOrientation) {
            $(this.el).addClass('rotate')
        }

        return this
    },

    _position: function() {
        var offset = this.options.parent.$('img').offset()
        $(this.el).css({
            left: offset.left,
            top: offset.top
        })
    },

    _size: function(images) {
        var side = $(this.el).is('.flipped') ? images.back : images.front
        $(this.el).css({
            width: side.width,
            height: side.height
        })
        this.$('.front').attr('width', images.front.width)
        this.$('.back').attr('width', images.back.width)
    },

    _setImages: function(images) {
        this.$('.front').attr('src', baseURL + images.front.filename)
        this.$('.back').attr('src', baseURL + images.back.filename)
    },

    zoom: function() {
        var $el = $(this.el),
            images = this.model.get('images')

        $el.toggleClass('flipped')
        if ($el.is('.flipped')) {
            this._setImages(images.full)
            this._size(images.full)
            $el.css({
                'left': ($(window).width() - images.full.back.width) / 2,
                'top': ($(window).height() - images.full.back.height) / 2,
            })
        } else {
            this._position()
            this._size(images.small)
            $(this.el).one('webkitTransitionEnd', _.bind(function() {
                this._setImages(images.small)
                this.trigger('unzoom')
            }, this))
        }
    }
})

var PostcardView = Backbone.View.extend({
    tagName: 'div',
    className: 'postcard',

    events: {
        'click': 'zoom'
    },

    render: function() {
        var thumb = this.model.get('images').small
        $(this.el).append(
            this.make('img', {
                src: baseURL + thumb.front.filename
            }))
        return this
    },
    
    zoom: function() {
        if (!$(this.el).is('.zoomed')) {
            $(this.el).addClass('zoomed')
            var zoom = new PostcardZoomView({model: this.model, parent: this})
            zoom.bind('unzoom', function() {
                $(zoom.el).remove()
                $(this.el).removeClass('zoomed')
            }, this)

            $('body').append(zoom.render().el)
            setTimeout(function() {
                zoom.zoom()
            }, 0)
        }
    },
})

var PostcardTileView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'addOne', 'addAll')

        this.collection
            .bind('add', this.addOne)
            .bind('reset', this.addAll)

        this.collection.fetch()
    },

    addOne: function(postcard) {
        var view = new PostcardView({model: postcard})
        $(this.el).append(view.render().el)
    },

    addAll: function() {
        this.collection.chain()
            /*.sortBy(function(p) {
                return p.get('images').small.front.height
            })*/
            .first(50)
            .each(this.addOne);
        
        /*
        $(this.el).masonry({
            itemSelector: '.postcard',
            columnWidth: 215,
            gutterWidth: 8,
            isFitWidth: true
        })
        */
    }
})


$(function() {
    var postcards = new PostcardCollection,
        grid = new PostcardTileView({
            el: $('#postcards'),
            collection: postcards
        })
})

