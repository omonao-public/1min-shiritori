import json
import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key
import base64
import hashlib
import io

s3 = boto3.resource('s3')
bucket = s3.Bucket('1m-shiritori')
bucket_png = s3.Bucket('shiritori.site')

dynamodb = boto3.resource('dynamodb')
table    = dynamodb.Table('1m-shiritori-db')

prev_count = 3

def lambda_handler(event, context):
    
    if event.get('base64', ""):
        prev_key = event.get('key', "")
        name = event.get('name', "名無し")
        next_prev_keys = []
        if prev_key:
            response = table.get_item(Key={'pictureKey': prev_key})
            prev_item = response['Item']
            prev_keys = prev_item['prevKeys']
            next_prev_keys = [prev_key] + prev_keys[:(prev_count - 1)]
            
        text_time = datetime.now().strftime('%Y%m%d%H%M%S')
        # image_body = base64.b64decode(event['base64'])
        image_body = event['base64']
        
        key = hashlib.sha256((prev_key + text_time).encode('utf-8')).hexdigest()
        img = image_body.split(',')[1]
        img = base64.b64decode((img + '=' * (-len(img) % 4)).encode())
        img = io.BytesIO(img)
        img.mode = 'rb'
        
        # generate index.html for ogp
        format_key = 'subpage_format.html'
        txt = bucket_png.Object(key=format_key).get()["Body"].read().decode('utf-8')
        # print(txt)
        txt = txt.replace('##key##', key)
        
        bucket_png.Object(key=f'html/{key}.html').put(Body=txt, ContentType='text/html')
        print(key)
        # return
    
        # put image file for ogp
        bucket_png.put_object(
            Body = img,
            Key = f'png/{key}.png',
            ContentType = 'png'
        )
        # put image file for main
        bucket.put_object(
            Body = image_body,
            Key = key
        )
        
        # put history file to dinamoDB
        table.put_item(
            Item={
                'pictureKey': key,
                'prevKeys': next_prev_keys,
                'name': name
           }
        )
        return {'statusCode': 200, 'body': key}
    
    return {'statusCode': 400, 'body': 'no image'}
