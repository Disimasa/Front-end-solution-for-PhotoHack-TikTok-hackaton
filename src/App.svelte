<script>
    import { slide, fly, crossfade } from 'svelte/transition';
    let nav_selected = 'main';
    const [send, receive] = crossfade({
		duration: d => Math.sqrt(d * 500)
	});
    let menu_visibility = 0;
    function Menu() {
        if (menu_visibility === 0) {
            menu_visibility = 1;
        } else {
            menu_visibility = 0;
        }
    }
    const url = '';
    async function Fetch() {
        let headers = new Headers();
        headers.append('Accept', 'application/json');
        let form_data = new FormData();
        let myFile = document.getElementById('FileForm').files[0];
        form_data.append('file', myFile, "file.png");
        response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: form_data
        }).then(response => response.json());
    }
</script>
<link href="https://fonts.googleapis.com/css?family=Comfortaa&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Playfair+Display&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Bad+Script&display=swap" rel="stylesheet">
<style>
    @media only screen and (max-width: 350px) {
        .text_block h1 {
            font-size: 13px;
            line-height: 30px;
        }

        .text {
            font-size: 15px;
        }

        .upload_image {
            width: 40px;
            height: 40px;
        }

        .p_upload_image {
            font-size: 1em;
        }
    }

    @media only screen and (max-width: 780px) and (min-width: 350px) {
        .text_block h1 {
            font-size: 20px;
            line-height: 40px;
        }

        .text {
            font-size: 20px;
        }

        .upload_image {
            width: 50px;
            height: 50px;
        }

        .p_upload_image {
            font-size: 5vw;
        }
    }

    @media only screen and (max-width: 780px) {
        .main,.info,.API,.contacts {
            display: none;
        }
        .window {
            width: 100%;
            height: 100%;
            text-align: center;
            background-color: white;
        }

        .header {
            display: grid;
            grid-template-columns: 20px 20% minmax(0, 1fr) 50px;
            margin: 0;
            width: 100%;
            height: 50px;
            background-color: #f9f9f9;
        }

        .shadow {
            box-shadow: 0 6px 6px 0 rgba(50, 50, 50, .3);
        }

        .logo {
            display: flex;
            justify-content: center;
            align-items: center;
            text-decoration: none;
            height: 100%;
            font-size: 14px;
            font-family: 'Comfortaa', cursive;
            color: white;
            padding-left: 5px;
        }

        .logo a {
            color: black;
            text-decoration: none;
        }

        .logo h1 {
            background: linear-gradient(90deg, #FF5023, #f7a731);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 2em;
            padding: 0;
            margin: auto;
            font-weight: bold;
            white-space: nowrap;
            font-family: 'Bad Script', cursive;
        }

        .menu {
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            width: 100%;
        }

        .menu img {
            margin-bottom: 5px;
        }

        .content {
            width: 100%;
            text-align: center;
        }

        .submenu {
            box-shadow: 0 6px 6px 0 rgba(50, 50, 50, .3);
            margin: 0 0 20px 0;
            padding: 0;
        }

        .ul_submenu {
            background-color: #f9f9f9;
            list-style-type: none;
            text-align: left;
            margin: 0;
            padding: 0;
            width: 100%;
        }

        .ul_submenu a {
            color: black;
            text-decoration: none;
        }

        .ul_submenu li {
            font-family: 'Comfortaa', cursive;
            font-size: 1.3em;
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 5px;
        }

        .form_upload_image {
            width: 100%;
            display: flex;
            align-items: center;
            flex-direction: column;
            justify-content: center;
            margin-bottom: 20px;
        }

        .input_upload_image {
            width: 0.1px;
            height: 0.1px;
            opacity: 0;
            overflow: hidden;
            position: absolute;
            z-index: -1;
        }

        .input_upload_image + label {
            margin-top: 20px;
            cursor: pointer;
        }

        .upload_image {
            margin: 5px 10px 5px 5px;
        }

        .label_input_upload_image {
            border: 4px solid #ed5600;
            border-radius: 10px;
            background-color: #f9f9f9;
            display: flex;
            align-items: center;
            width: auto;
            margin-bottom: 10px;
        }

        .p_upload_image {
            font-family: 'Comfortaa', cursive;
            padding: 0;
            margin: 10px;
        }

        .content h1 {
            font-family: 'Bad Script', cursive;
        }

        .text_block {

            background: linear-gradient(90deg, #f7a731, #FF5023);
            width: 80%;
            max-width: 500px;
            margin: 20px auto auto auto;
            text-align: center;
            border-radius: 10px;
            color: white;
        }

        .text_block h1 {
            font-family: 'Comfortaa', cursive;
            padding: 15px;
        }

        .people_image {
            width: 80%;
        }

        .all {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .text {
            width: 80%;
            margin: auto;
            font-family: 'Comfortaa', cursive;
            text-align: left;
        }

        .form_button {
            background: linear-gradient(180deg, #FF5023, #f7a731);
            width: auto;
            border-radius: 10px;
            border: 0;
            color: white;
            font-family: 'Comfortaa', cursive;
            font-size: 5vw;
            padding: 10px;
        }

        .form_button:hover {
            cursor: pointer;
        }
    }

    @media only screen and (min-width: 780px) {
    .menu, .ul_submenu, .empty_1, .people_image, .content {
        display: none;
    }
    .header {
        position: relative;
        display: grid;
        grid-template-columns: 20% minmax(50px, 32%) 12% 12% 12% 12%;
        height: 50px;
        margin: auto;
        box-shadow: 0 6px 6px 0 rgba(50, 50, 50, .3);
    }
    .logo, .main, .info, .API, .contacts {
        position: relative;
        font-family: 'Comfortaa', cursive;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .main, .info, .API, .contacts:hover {
        cursor: pointer;
    }
    .logo {
        background: linear-gradient(90deg, #FF5023, #f7a731);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
    }
.logo h1 {
    font-size: 26px;
    font-family: 'Bad Script', cursive;
    padding: 0;
    margin:0 80px 0 0;
}
.mask {
    position: absolute;
    width: 100%;
    height: 100%;
    border-bottom: 2px solid #FF5023;
}
}
</style>
<div class="window">
    <div class="header {menu_visibility === 0 ? 'shadow' : ''}">
        <div class="empty_1">
        </div>
        <div class="logo">
            <h1>Ani me</h1>
        </div>
        <div class="empty">
        </div>
        <div class="main" on:click="{() => nav_selected = 'main'}">
            {#if nav_selected === 'main'}
            <div class="mask" in:receive out:send></div>
                {/if}
            <p>Главная</p>
        </div>
        <div class="info" on:click="{() => nav_selected = 'info'}">
            {#if nav_selected === 'info'}
                <div class="mask" in:receive out:send></div>
                {/if}
            <p>О сервисе</p>
            </div>
        <div class="API" on:click="{() => nav_selected = 'API'}">
             {#if nav_selected === 'API'}
                <div class="mask" in:receive out:send></div>
                {/if}
            <p>API</p>
        </div>
        <div class="contacts" on:click="{() => nav_selected = 'contacts'}">
             {#if nav_selected === 'contacts'}
                <div class="mask" in:receive out:send></div>
                {/if}
            <p>Контакты</p>
        </div>
        {#if menu_visibility === 0}
            <div class="menu" on:click={Menu}>
                <img src='menu.png' width="30px" height="30px" alt="">
            </div>
        {:else}
            <div class="menu" on:click={Menu}>
                <img src='close.png' width="22px" height="22px" alt="">
            </div>
        {/if}
    </div>
    <div class="content">
        {#if menu_visibility === 1}
            <div transition:slide|local class="submenu">
                <ul class="ul_submenu">
                    <li></li>
                    <li><a href="/">Главная</a></li>
                    <li><a href="/">О сервисе</a></li>
                    <li><a href="/">API</a></li>
                    <li><a href="/">Контакты</a></li>
                    <li></li>
                </ul>
            </div>
        {/if}
        {#if nav_selected === 'main'}
<div class="content_main">

</div>
            {:else if nav_selected === 'info'}

            {:else if nav_selected === 'API'}

            {:else}

            {/if}
        <div class="text_block">
            <h1>Создавайте видео потрясающих танцев для TikTok всего лишь из одной фотографии!</h1>
        </div>
        <img src="people.jpg" class="people_image" alt="">
        <div class="all">
            <div class="text">
                <p>Преображение основано на технологии Machine Learning.</p>
                <p>Однако чтобы получить готовое видео не нужно проделывать сложные операции: достаточно загрузить фото
                    в полный рост.</p>
            </div>
        </div>
        <form class="form_upload_image" method='POST' id="Form">
            <input class="input_upload_image" type="file" name="file" id="FileForm"/>
            <label for="FileForm" class="label_input_upload_image">
                <img src="upload.png" class="upload_image" alt="">
                <p class="p_upload_image">Загрузить файл</p>
            </label>
            <button class="form_button" on:click={Fetch} type="button">Отправить</button>
        </form>
    </div>
</div>