import {
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
} from "@chakra-ui/react";
import { IoSearchOutline } from "react-icons/io5";
import {taskOptions, languageOptions} from "../../components/Utils/Options"
import useMediaQuery from "../../hooks/useMediaQuery";
import ContentLayout from "../../components/Layouts/ContentLayout";
import { useState, useEffect } from "react";
import Head from "next/head";
import { listModels } from "../../api/modelAPI";
import { useQuery } from "@tanstack/react-query";
import ModelsTable from "../../components/Models/ModelsTable";
import NotFound from "../../components/Utils/NotFound";
import ModelsList from "../../components/Mobile/Models/ModelsList";

export default function Models() {
  const { data: models } = useQuery(["models"], listModels);
  const [hide, togglehide] = useState<boolean>(true);
  const [sourceLang, setSourceLanguage] = useState<String>("");
  const [targetLang, setTargetLanguage] = useState<String>("");
  const [task, setTask] = useState<string>("");
  const [hideTarget, setHideTarget] = useState<boolean>(true);
  const smallscreen = useMediaQuery("(max-width: 1080px)");
  const [filteredModels, setFilteredModels] = useState<ModelList[]>(models);
  const [searchedModels, setSearchedModels] = useState<ModelList[]>([]);
  const [seed, setSeed] = useState<number>(0);

  const clearFilters = () => {
    setTask("");
    setSeed(Math.random());
    setSourceLanguage("");
    setTargetLanguage("");
    setFilteredModels(models);
    setSearchedModels(models);
  };

  const searchToggler = (event: any) => {
    setSearchedModels(
      filteredModels.filter((model) =>
        model.name.toLowerCase().includes(event.target.value.toLowerCase())
      )
    );
  };

  const filterToggler = () => {
    let filtered = models;
    if (task) {
      filtered = filtered.filter(model =>
        model.task && model.task === task
      );
    }
    if (sourceLang) {
      filtered = filtered.filter(model =>
        model.languages && model.languages.some(lang => lang.split('-')[0] === sourceLang)
      );
    }
    if (targetLang) {
      filtered = filtered.filter(model =>
        model.languages && model.languages.some(lang => lang.split('-')[1] === targetLang)
            );
    }
    setFilteredModels(filtered);
  };

  const sourceLangToggler = (event: any) => {
    setSourceLanguage(event.target.value);
  };

  const targetLangToggler = (event: any) => {
    setTargetLanguage(event.target.value);
  };

  const taskToggler = (event: any) => {
    setTask(event.target.value);
  };

  useEffect(() => {
    filterToggler();
    if (task == "translation") {
      setHideTarget(false);
    } else {
      setHideTarget(true);
      setTargetLanguage("");
    }
  }, [sourceLang, targetLang, task]);

  useEffect(() => {
    setSearchedModels(filteredModels);
  }, [filteredModels]);

  useEffect(() => {
    if (models) {
      setFilteredModels(models);
      setSearchedModels(models);
      togglehide(false);
    }
  }, [models]);

  return (
    <>
      <Head>
        <title>Models Registry</title>
      </Head>
      <ContentLayout>
        <Box bg="light.100" ml={smallscreen ? "1rem" : "0rem"} key={seed}>
          {/* Searchbar */}
          <Stack background={"gray.50"} direction={['column','column','column','column', 'row']}>
          <InputGroup
                width={smallscreen ? "90vw" : "30rem"}
                background={"white"}
              >
                <InputLeftElement
                  color="gray.600"
                  pointerEvents="none"
                  children={<IoSearchOutline />}
                />
                <Input
                  borderRadius={0}
                  onChange={searchToggler}
                  placeholder="Search for Models"
                />
              </InputGroup>{" "}
              <Select
                value={task}
                width={smallscreen ? "90vw" : "20rem"}
                background={"white"}
                borderRadius={0}
                color="gray.600"
                onChange={taskToggler}
              >
                <option hidden defaultChecked>
                  Select Task Type
                </option>
                {taskOptions}
              </Select>
              <InputGroup
                width={smallscreen ? "90vw" : "30rem"}
                background={"white"}
              >
                <Select
                  background={"white"}
                  borderRadius={0}
                  color="gray.600"
                  onChange={sourceLangToggler}
                >
                  <option hidden defaultChecked>
                    Source Language
                  </option>
                  {languageOptions}
                </Select>
                <Select
                  background={"white"}
                  borderRadius={0}
                  display={hideTarget ? "none" : "block"}
                  onChange={targetLangToggler}
                  color="gray.600"
                >
                  <option hidden defaultChecked>
                    Target Language
                  </option>
                  {languageOptions}
                </Select>
              </InputGroup>
              <Button
                width={smallscreen ? "90vw" : "8rem"}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
          </Stack>
        </Box>
        <br />
        {searchedModels?
        searchedModels.length !== 0?
        smallscreen? <ModelsList data={searchedModels}/>:<ModelsTable data = {searchedModels}/>
        :<NotFound hide={hide}/>
        :<></>
      }
      </ContentLayout>
    </>
  );
}
