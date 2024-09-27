from flask import render_template, g, request, session

from bitem import app


@app.route('/presi/<int:id>/')
def presi(id: int):
    lang = (session.get(
        'language',
        request.accept_languages.best_match(
            app.config['LANGUAGES'].keys())))

    iiifUrl = app.config['IIIF_URL']

    def translate_text(text, lang):
        start_marker = f"##{lang}_##"
        end_marker = f"##_{lang}##"

        start_index = text.find(start_marker)
        end_index = text.find(end_marker)

        if start_index != -1 and end_index != -1:
            return text[start_index + len(start_marker):end_index].strip()

        parts = text.split("##")
        fallback_text = " ".join(part.strip() for i, part in enumerate(parts) if i % 2 == 0 and part.strip())

        return fallback_text

    def translate_ids(id, lang):
        g.cursor.execute(
            f"SELECT data -> '_label' -> '{lang.upper()}' AS label, data -> '_label' -> 'name' AS name FROM bitem.tbl_allitems WHERE id = {id}")
        result = g.cursor.fetchone()
        if result:
            if result.label:
                return result.label
            else:
                return result.name
        else:
            g.cursor.execute(
                f"SELECT description from model.entity WHERE id = {id}")
            result = g.cursor.fetchone()
            if result.description:
                return result.description

    def get_media(id):
        if id:
            g.cursor.execute(
                f"SELECT mimetype, filename FROM bitem.files WHERE id = {id}")
            result = g.cursor.fetchone()
            file = None
            if result:
                if result.mimetype == 'img':
                    file = iiifUrl + result.filename + '/full/max/0/default.jpg'
                if result.mimetype == '3d' and result.filename.endswith('.glb'):
                    file = app.config['OPENATLAS_UPLOAD_FOLDER'] + '/' + result.filename
                return {'mime': result.mimetype, 'file': file}
            else:
                g.cursor.execute(
                    f"SELECT data -> 'geometry' AS geometry FROM bitem.tbl_allitems WHERE id = {id} AND openatlas_class_name = 'place'")
                result = g.cursor.fetchone()
                if result:
                    return {'mime': 'map', 'file': result.geometry}

        return None


    story = []

    g.cursor.execute(f'SELECT * FROM bitem.stories WHERE story_id = {id} ORDER BY sortorder')
    result = g.cursor.fetchall()
    story = {}

    story['name'] = translate_text(result[0].story_name, lang)
    story['slides'] = []
    story['casestudy'] = result[0].case_study
    story['map'] = result[0].map
    story['map_origin'] = get_media(result[0].map_origin)

    if result:
        i = 1
        for row in result:
            slide = {'order': i, 'heading': None, 'text': None, 'subtext': None, 'background': None, 'media': [], 'goto':[], 'jump_to': None}
            i += 1

            if row.element_heading and not row.element_heading.isdigit():
                slide['heading'] = translate_text(row.element_heading, lang)
            if row.element_heading and row.element_heading.isdigit():
                slide['heading'] = translate_ids(row.element_heading, lang)

            if row.element_text and not row.element_text.isdigit():
                slide['text'] = translate_text(row.element_text, lang)
            if row.element_text and row.element_text.isdigit():
                slide['text'] = translate_ids(row.element_text, lang)
            if row.element_subtext and not row.element_subtext.isdigit():
                slide['subtext'] = translate_text(row.element_subtext, lang)
            if row.element_subtext and row.element_subtext.isdigit():
                slide['subtext'] = translate_ids(row.element_subtext, lang)

            if row.element_background:
                file = get_media(row.element_background)
                slide['background'] = file

            if row.element_media1:
                media1 = get_media(row.element_media1)
                if media1:
                    slide['media'].append(media1)

            if row.element_media2:
                media2 = get_media(row.element_media2)
                if media2:
                    slide['media'].append(media2)

            if row.element_media3:
                media3 = get_media(row.element_media3)
                if media3:
                    slide['media'].append(media3)
                    
            if row.goto1:
                goto1 = row.goto1
                if goto1:
                    slide['goto'].append(goto1)

            if row.goto2:
                goto2 = row.goto2
                if goto2:
                    slide['goto'].append(goto2)

            if row.goto3:
                goto3 = row.goto3
                if goto3:
                    slide['goto'].append(goto3)

            if row.jump_to:
                slide['jump_to'] = get_media(row.jump_to)['file']
                    
            story['slides'].append(slide)
    import random
    import math

    def generate_spiral_positions(num_positions, initial_distance=3500, angle_increment=45):
        """
        Generate slide positions arranged in a spiral pattern with random scales and rotations.

        :param num_positions: Number of positions to generate.
        :param initial_distance: Starting distance from the origin for the spiral pattern.
        :param angle_increment: Angle increment in degrees for each subsequent position.
        :return: A list of dictionaries with slide positions and attributes.
        """
        positions = [{'data-x': 0, 'data-y': 0, 'data-z': 1000, 'data-scale': 3}]
        current_angle = 0  # Starting angle in degrees
        current_distance = initial_distance  # Starting distance from the origin

        for i in range(num_positions):
            # Convert polar coordinates (r, θ) to Cartesian coordinates (x, y)
            x = round(current_distance * math.cos(math.radians(current_angle)), 2)
            y = round(current_distance * math.sin(math.radians(current_angle)), 2)

            # Generate random scale between 0 and 6
            scale = round(random.uniform(1, 4), 2)

            # Randomly decide if the slide should have a rotation
            rotate = random.choice([None, random.randint(0, 360)]) if random.random() < 0.1 else None
            rotate_x = random.choice([None, random.randint(-90, 90)]) if random.random() < 0.1 else None
            rotate_y = random.choice([None, random.randint(-90, 90)]) if random.random() < 0.1 else None

            # Construct the position dictionary
            position = {'data-x': str(x), 'data-y': str(y), 'data-scale': str(scale)}

            # Optionally add rotations if present
            if rotate is not None:
                position['data-rotate'] = str(rotate)
            if rotate_x is not None:
                position['data-rotate-x'] = str(rotate_x)
                position['data-z'] = str(700)
            if rotate_y is not None:
                position['data-rotate-y'] = str(rotate_y)
                position['data-z'] = str(700)

            # Add the generated position to the list
            positions.append(position)

            # Update the angle and distance for the next position to create a spiral
            current_angle += random.randint(30, 70)  # Increment angle for spiral effect
            current_distance += initial_distance * 0.1  # Increment distance gradually to avoid overlaps

        return positions

    positions = generate_spiral_positions((len(story['slides'])-1))

    return render_template("/presi/presi.html", story=story, positions=positions)
