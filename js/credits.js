// Danh sách ảnh/logo tự do đã tải (tự sinh). Mỗi mục: tên, đường dẫn, tác giả, giấy phép, nguồn.
const IMAGE_CREDITS = [
    {
        "name":  "Looper",
        "path":  "img/players/Looper.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Looper_at_Masters_3_vs_LGD_Gaming,_19_July_2015_Shanghai_(115499849).jpg",
        "edited":  true
    },
    {
        "name":  "Smeb",
        "path":  "img/players/Smeb.jpg",
        "artist":  "Fomos Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Smeb_2018_interview.jpg",
        "edited":  true
    },
    {
        "name":  "Huni",
        "path":  "img/players/Huni.jpg",
        "artist":  "Echo Fox",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Heo_%22Huni%22_Seung-hoon_(October_2018).jpg",
        "edited":  true
    },
    {
        "name":  "Bwipo",
        "path":  "img/players/Bwipo.jpg",
        "artist":  "FlyQuest League of Legends",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Bwipo_in_2024_-_03_(cropped).jpg",
        "edited":  true
    },
    {
        "name":  "Licorice",
        "path":  "img/players/Licorice.jpg",
        "artist":  "Fomos Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Licorice_2019_Worlds_Interview.jpg",
        "edited":  true
    },
    {
        "name":  "Flandre",
        "path":  "img/players/Flandre.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:1cun8137_Jpg_(118342889).jpeg",
        "edited":  true
    },
    {
        "name":  "Kingen",
        "path":  "img/players/Kingen.jpg",
        "artist":  "fomos esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:%ED%82%B9%EA%B2%90_%ED%99%A9%EC%84%B1%ED%9B%88.jpg",
        "edited":  true
    },
    {
        "name":  "Doran",
        "path":  "img/players/Doran.jpg",
        "artist":  "Fomos Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Doran_2025.jpg",
        "edited":  true
    },
    {
        "name":  "Bengi",
        "path":  "img/players/Bengi.jpg",
        "artist":  "acrofan.com",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:2015_%EB%A1%A4%EC%B1%94%EC%8A%A4_%EC%BD%94%EB%A6%AC%EC%95%84_%EC%8A%A4%ED%94%84%EB%A7%81_%EC%9A%B0%EC%8A%B9%ED%8C%80_SKT_T1_%EC%9D%B8%ED%84%B0%EB%B7%B0_(%EB%B0%B0%EC%84%B1%EC%9B%85).jpg",
        "edited":  true
    },
    {
        "name":  "Peanut",
        "path":  "img/players/Peanut.jpg",
        "artist":  "E레기",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Peanut_at_MSI_2023.jpg",
        "edited":  true
    },
    {
        "name":  "Ambition",
        "path":  "img/players/Ambition.jpg",
        "artist":  "TOPCLASS",
        "license":  "CC BY 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:150110_LOL_Champions_Korea_Spring_SKT_vs_CJ_(2).jpg",
        "edited":  true
    },
    {
        "name":  "Svenskeren",
        "path":  "img/players/Svenskeren.jpg",
        "artist":  "Kevin Chang for Team Liquid",
        "license":  "CC BY-SA 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Svenskeren_at_the_NA_LCS_Summer_2016_Finals.jpg",
        "edited":  true
    },
    {
        "name":  "SofM",
        "path":  "img/players/SofM.jpg",
        "artist":  "SofM (Lê Quang Duy)",
        "license":  "CC BY 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:SofM.jpg",
        "edited":  true
    },
    {
        "name":  "Kanavi",
        "path":  "img/players/Kanavi.jpg",
        "artist":  "E레기",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Kanavi_2020_interview.jpg",
        "edited":  true
    },
    {
        "name":  "Blaber",
        "path":  "img/players/Blaber.jpg",
        "artist":  "Liga Latinoamérica (LLA)",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Blaber_at_2021_Worlds.jpg",
        "edited":  true
    },
    {
        "name":  "Cuzz",
        "path":  "img/players/Cuzz.jpg",
        "artist":  "fomos esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:%EC%BB%A4%EC%A6%88_%EB%AC%B8%EC%9A%B0%EC%B0%AC.jpg",
        "edited":  true
    },
    {
        "name":  "Faker",
        "path":  "img/players/Faker.jpg",
        "artist":  "Marie Claire",
        "license":  "CC BY 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:T1_Faker_Lee_Sang-Hyeok_in_a_2026_Interview.png",
        "edited":  true
    },
    {
        "name":  "PawN",
        "path":  "img/players/PawN.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:PawN_at_H2k_Gaming_vs_Edward_Gaming,_2_October_2015,_Paris_(123773159).jpg",
        "edited":  true
    },
    {
        "name":  "Ucal",
        "path":  "img/players/Ucal.jpg",
        "artist":  "TEENAGE DREAM",
        "license":  "CC BY 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:180908_LCK_SUMMER_FINAL_%EC%9D%B8%EC%B2%9C_%EC%82%BC%EC%82%B0%EC%B2%B4%EC%9C%A1%EA%B4%80_vsGRF_-KTRolster_-Ucal_(3).jpg",
        "edited":  true
    },
    {
        "name":  "Doinb",
        "path":  "img/players/Doinb.jpg",
        "artist":  "LPL",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Doinb_in_Journey_to_the_Top_-_2022_LPL_Spring_Split.jpg",
        "edited":  true
    },
    {
        "name":  "ShowMaker",
        "path":  "img/players/ShowMaker.jpg",
        "artist":  "fomos esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Showmaker,_fomos_esports_2019.png",
        "edited":  true
    },
    {
        "name":  "Chovy",
        "path":  "img/players/Chovy.jpg",
        "artist":  "E레기",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Chovy_Season_Kickoff_2023.jpg",
        "edited":  true
    },
    {
        "name":  "Bdd",
        "path":  "img/players/Bdd.jpg",
        "artist":  "fomos esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:BDD_interview_2021.jpg",
        "edited":  true
    },
    {
        "name":  "Ruler",
        "path":  "img/players/Ruler.jpg",
        "artist":  "fomos esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Ruler_interview_2022.jpg",
        "edited":  true
    },
    {
        "name":  "Deft",
        "path":  "img/players/Deft.jpg",
        "artist":  "E레기",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Deft_interview_in_2022.jpg",
        "edited":  true
    },
    {
        "name":  "Uzi",
        "path":  "img/players/Uzi.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Uzi,_2015_LPL_season.jpeg",
        "edited":  true
    },
    {
        "name":  "Rekkles",
        "path":  "img/players/Rekkles.jpg",
        "artist":  "G2 Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Rekkles_in_2021.jpg",
        "edited":  true
    },
    {
        "name":  "Sneaky",
        "path":  "img/players/Sneaky.jpg",
        "artist":  "Kevin Chang for Team Liquid",
        "license":  "CC BY-SA 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Sneaky_at_NA_LCS_Summer_2016_Finals.jpg",
        "edited":  true
    },
    {
        "name":  "Doublelift",
        "path":  "img/players/Doublelift.jpg",
        "artist":  "G2 Esports - 0:11",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Doublelift.jpg",
        "edited":  true
    },
    {
        "name":  "Perkz",
        "path":  "img/players/Perkz.jpg",
        "artist":  "G2 Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Perkz_2020.jpg",
        "edited":  true
    },
    {
        "name":  "Gumayusi",
        "path":  "img/players/Gumayusi.jpg",
        "artist":  "Marie Claire",
        "license":  "CC BY 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:T1_Gumayusi_Lee_Min-hyeong_in_an_interview,_2026.png",
        "edited":  true
    },
    {
        "name":  "Peyz",
        "path":  "img/players/Peyz.jpg",
        "artist":  "E레기",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:GEN_Peyz_2023.jpg",
        "edited":  true
    },
    {
        "name":  "Hans Sama",
        "path":  "img/players/Hans%20Sama.jpg",
        "artist":  "Fomos Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Hans_Sama_2025.jpg",
        "edited":  true
    },
    {
        "name":  "CoreJJ",
        "path":  "img/players/CoreJJ.jpg",
        "artist":  "YinChannel",
        "license":  "CC BY 2.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/2.0",
        "page":  "https://commons.wikimedia.org/wiki/File:CoreJJ,_NA_LCS_2015_Summer_Split_Week_6_Day_2.jpg",
        "edited":  true
    },
    {
        "name":  "Hylissang",
        "path":  "img/players/Hylissang.jpg",
        "artist":  "Kevin Chang for Team Liquid",
        "license":  "CC BY-SA 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Hylissang_at_IEM_San_Jose_2015.jpg",
        "edited":  true
    },
    {
        "name":  "Mikyx",
        "path":  "img/players/Mikyx.jpg",
        "artist":  "G2 Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Mikyx.png",
        "edited":  true
    },
    {
        "name":  "Effort",
        "path":  "img/players/Effort.jpg",
        "artist":  "acrofan.com",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:CJ_EffOrt.JPG",
        "edited":  true
    },
    {
        "name":  "Keria",
        "path":  "img/players/Keria.jpg",
        "artist":  "fomos esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Keria,_2023_worlds_winning_team_interview.jpg",
        "edited":  true
    },
    {
        "name":  "Lehends",
        "path":  "img/players/Lehends.jpg",
        "artist":  "fomos esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:%EB%A6%AC%ED%97%A8%EC%A6%88_%EC%86%90%EC%8B%9C%EC%9A%B0.jpg",
        "edited":  true
    },
    {
        "name":  "Vulcan",
        "path":  "img/players/Vulcan.jpg",
        "artist":  "Liga Latinoamérica (LLA)",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Vulcan_at_2021_Worlds.jpg",
        "edited":  true
    },
    {
        "name":  "Impact",
        "path":  "img/players/Impact.jpg",
        "artist":  "artubr",
        "license":  "CC BY 2.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/2.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Impact_at_LoL_World_Championship_2013_(cropped).jpg",
        "edited":  true
    },
    {
        "name":  "Wunder",
        "path":  "img/players/Wunder.jpg",
        "artist":  "G2 Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Wunder_in_2021.jpg",
        "edited":  true
    },
    {
        "name":  "Zeus",
        "path":  "img/players/Zeus.jpg",
        "artist":  "Fomos Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Zeus,_2023_worlds_winning_team_interview.jpg",
        "edited":  true
    },
    {
        "name":  "Dandy",
        "path":  "img/players/Dandy.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:DanDy_in_2015.jpeg",
        "edited":  true
    },
    {
        "name":  "Karsa",
        "path":  "img/players/Karsa.jpg",
        "artist":  "Urielpunk",
        "license":  "CC BY 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Karsa_(cropped).jpg",
        "edited":  true
    },
    {
        "name":  "Oner",
        "path":  "img/players/Oner.jpg",
        "artist":  "Fomos Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Oner_in_2024.jpg",
        "edited":  true
    },
    {
        "name":  "Yike",
        "path":  "img/players/Yike.jpg",
        "artist":  "LTA Español",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Yike_MSI_2023.jpg",
        "edited":  true
    },
    {
        "name":  "Kuro",
        "path":  "img/players/Kuro.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:KurO_(Lee_Seo-haeng_%EC%9D%B4%EC%84%9C%ED%96%89)_at_2015_LoL_Worlds.jpg",
        "edited":  true
    },
    {
        "name":  "Rookie",
        "path":  "img/players/Rookie.jpg",
        "artist":  "Kevin Chang for Team Liquid",
        "license":  "CC BY-SA 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0/",
        "page":  "https://commons.wikimedia.org/w/index.php?curid=128916784",
        "edited":  true
    },
    {
        "name":  "Caps",
        "path":  "img/players/Caps.jpg",
        "artist":  "Fomos Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Caps_2025.jpg",
        "edited":  true
    },
    {
        "name":  "Jensen",
        "path":  "img/players/Jensen.jpg",
        "artist":  "Kevin Chang for Team Liquid",
        "license":  "CC BY-SA 4.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/4.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Jensen_at_NA_LCS_Summer_2016_Finals.jpg",
        "edited":  true
    },
    {
        "name":  "Xiaohu",
        "path":  "img/players/Xiaohu.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Xiaohu_at_the_Royal_Never_Give_Up_2015_LPL_season_in_Shanghai_(115497889).jpg",
        "edited":  true
    },
    {
        "name":  "Piglet",
        "path":  "img/players/Piglet.jpg",
        "artist":  "artubr",
        "license":  "CC BY 2.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/2.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Piglet_at_LoL_World_Championship_2013_(cropped).jpg",
        "edited":  true
    },
    {
        "name":  "Imp",
        "path":  "img/players/Imp.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Imp_at_Worlds_2015.jpeg",
        "edited":  true
    },
    {
        "name":  "Viper",
        "path":  "img/players/Viper.jpg",
        "artist":  "LoL Esports",
        "license":  "CC BY 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Viper_Worlds21.png",
        "edited":  true
    },
    {
        "name":  "Mata",
        "path":  "img/players/Mata.jpg",
        "artist":  "Bruce Liu",
        "license":  "CC BY-SA 3.0",
        "licenseUrl":  "https://creativecommons.org/licenses/by-sa/3.0",
        "page":  "https://commons.wikimedia.org/wiki/File:Mata_in_2015_LPL_Summer.jpeg",
        "edited":  true
    },
    {
        "kind":  "team",
        "code":  "SKT",
        "name":  "SK Telecom T1 (SKT) – logo",
        "path":  "img/teams/SKT.png",
        "artist":  "T1",
        "license":  "Public domain",
        "licenseUrl":  null,
        "page":  "https://commons.wikimedia.org/wiki/File:T1_esports_logo.svg",
        "edited":  true
    },
    {
        "kind":  "team",
        "code":  "T1",
        "name":  "T1 (T1) – logo",
        "path":  "img/teams/T1.png",
        "artist":  "T1",
        "license":  "Public domain",
        "licenseUrl":  null,
        "page":  "https://commons.wikimedia.org/wiki/File:T1_esports_logo.svg",
        "edited":  true
    },
    {
        "kind":  "team",
        "code":  "GEN",
        "name":  "Gen.G (GEN) – logo",
        "path":  "img/teams/GEN.png",
        "artist":  "Gen.G",
        "license":  "Public domain",
        "licenseUrl":  null,
        "page":  "https://commons.wikimedia.org/wiki/File:Gen.G_Logo.svg",
        "edited":  true
    },
    {
        "kind":  "team",
        "code":  "HLE",
        "name":  "Hanwha Life Esports (HLE) – logo",
        "path":  "img/teams/HLE.png",
        "artist":  "TheHirder",
        "license":  "Public domain",
        "licenseUrl":  null,
        "page":  "https://commons.wikimedia.org/wiki/File:Hanwha_Life_Esports_logo.svg",
        "edited":  true
    },
    {
        "kind":  "team",
        "code":  "RNG",
        "name":  "Royal Never Give Up (RNG) – logo",
        "path":  "img/teams/RNG.png",
        "artist":  "Royal Never Give Up",
        "license":  "Public domain",
        "licenseUrl":  null,
        "page":  "https://commons.wikimedia.org/wiki/File:RNG_logo.svg",
        "edited":  true
    },
    {
        "kind":  "team",
        "code":  "EDG",
        "name":  "EDward Gaming (EDG) – logo",
        "path":  "img/teams/EDG.png",
        "artist":  "Edward Gaming",
        "license":  "Public domain",
        "licenseUrl":  null,
        "page":  "https://commons.wikimedia.org/wiki/File:Edward_Gaming_logo.png",
        "edited":  true
    },
    {
        "kind":  "team",
        "code":  "C9",
        "name":  "Cloud9 (C9) – logo",
        "path":  "img/teams/C9.png",
        "artist":  "Cloud9",
        "license":  "Public domain",
        "licenseUrl":  null,
        "page":  "https://commons.wikimedia.org/wiki/File:Cloud9_logo_c._2023.svg",
        "edited":  true
    }
];
