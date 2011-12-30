import base64
import datetime

from flask import render_template, redirect, request, flash
from flaskext import wtf

from postcards import app
from postcards.models import db, Postcard, Tag
from postcards.lib.utils import BUCKET_NAME, upload_to_s3, thumbnail_image


class PostcardForm(wtf.Form):
    username = wtf.TextField(
        'username',
        validators=[
            wtf.Length(max=20),
            wtf.Required()
        ]
    )

    origin = wtf.TextField('origin', validators=[wtf.Required()])
    date = wtf.DateField('date of postmark',
                         format='%m/%d/%Y',
                         default=datetime.date(2010, 01, 01))
    origin_country = wtf.HiddenField()
    origin_latitude = wtf.DecimalField()
    origin_longitude = wtf.DecimalField()
    front = wtf.TextField('front of card')
    back = wtf.TextField('back of card')
    tags = wtf.TextField('tags (comma-delimited)')


@app.route('/')
def home():
    #top_tags = (db.session.query(Tag)
                    #.filter(Tag.tag != '')
                    #.group_by(Tag.tag)
                    #.order_by(db.desc(db.func.count(Tag.tag)))
                    #.limit(10))

    postcards = {}
    for postcard in db.session.query(Postcard).filter(Postcard.deleted == False).order_by(db.desc(Postcard.date)):
        postcards[postcard.id] = postcard

    for tag in db.session.query(Tag):
        if tag.postcard_id not in postcards:
            continue
        postcard = postcards[tag.postcard_id]
        if not hasattr(postcard, '_tags'):
            postcard._tags = []
        postcard._tags.append(tag.tag)

    return render_template(
        'home.html',
        postcards=postcards.values(),
        url_base='http://' + BUCKET_NAME + '.s3.amazonaws.com/'
    )


@app.route('/postcard/new', methods=['GET', 'POST'])
def new_postcard_form():
    form = PostcardForm(request.form)
    if request.method == 'POST' and form.validate():
        postcard = Postcard()
        postcard.user = form.username.data
        postcard.date = form.date.data
        postcard.country = form.origin_country.data
        postcard.latitude = form.origin_latitude.data
        postcard.longitude = form.origin_longitude.data
        postcard.front = form.front.data
        if postcard.front:
            postcard.front_thumb = thumbnail_image(postcard.front)
        postcard.back = form.back.data
        if postcard.back:
            postcard.back_thumb = thumbnail_image(postcard.back)
        postcard.deleted = False
        db.session.add(postcard)

        for tag in (x.strip() for x in form.tags.data.split(',')):
            t = Tag()
            t.tag = tag
            postcard.tags.append(t)

        db.session.commit()

        flash('postcard added!')
        return redirect('/postcard/new')
    return render_template('postcard_new.html', form=form)


@app.route('/upload', methods=['POST'])
def upload():
    data = base64.b64decode(request.data)
    return upload_to_s3(data)


@app.route('/postcard/delete', methods=['POST', 'DELETE'])
def delete():
    id = int(request.form['postcard-id'])
    postcard = db.session.query(Postcard).filter_by(id=id).one()
    postcard.deleted = True
    db.session.commit()
    return redirect('/')